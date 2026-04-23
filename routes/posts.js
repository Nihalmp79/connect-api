const express = require("express")
const { PrismaClient } = require("@prisma/client")

const router = express.Router()
const prisma = new PrismaClient()




// GET all posts — explore page
// GET all posts — with pagination
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          likes: true,
          comments: {
            include: {
              user: { select: { id: true, username: true, avatar: true } }
            },
            orderBy: { createdAt: "desc" }
          },
          _count: { select: { likes: true, comments: true } }
        }
      }),
      prisma.post.count()
    ])

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit)
      }
    })
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" })
  }
})
// GET feed — posts from followed users
// GET feed — with pagination
router.get("/feed", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const following = await prisma.follow.findMany({
      where: { followerId: req.userId },
      select: { followingId: true }
    })

    const followingIds = following.map(f => f.followingId)
    followingIds.push(req.userId)

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { userId: { in: followingIds } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          likes: true,
          comments: {
            include: {
              user: { select: { id: true, username: true, avatar: true } }
            },
            orderBy: { createdAt: "desc" }
          },
          _count: { select: { likes: true, comments: true } }
        }
      }),
      prisma.post.count({ where: { userId: { in: followingIds } } })
    ])

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit)
      }
    })
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch feed" })
  }
})



// GET one post
router.get("/:id", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: {
          select: { id: true, username: true, avatar: true }
        },
        likes: true,
        comments: {
          include: {
            user: { select: { id: true, username: true, avatar: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        _count: { select: { likes: true, comments: true } }
      }
    })
    if (!post) return res.status(404).json({ error: "Post not found" })
    res.json(post)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post" })
  }
})

// POST — create post
router.post("/", async (req, res) => {
  try {
    const { content, image } = req.body
    if (!content) {
      return res.status(400).json({ error: "Content is required" })
    }
    const post = await prisma.post.create({
      data: { content, image, userId: req.userId },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        likes: true,
        comments: true,
        _count: { select: { likes: true, comments: true } }
      }
    })
    res.status(201).json(post)
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" })
  }
})

// DELETE — delete post
router.delete("/:id", async (req, res) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId }
    })
    if (!post) return res.status(404).json({ error: "Post not found" })

    await prisma.post.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: "Post deleted" })
  } catch (error) {
    res.status(500).json({ error: "Failed to delete post" })
  }
})

// POST — toggle like
router.post("/:id/like", async (req, res) => {
  try {
    const postId = parseInt(req.params.id)

    // check if already liked
    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId: req.userId, postId } }
    })

    if (existing) {
      // unlike
      await prisma.like.delete({
        where: { userId_postId: { userId: req.userId, postId } }
      })
      return res.json({ liked: false })
    }

    // like
    await prisma.like.create({
      data: { userId: req.userId, postId }
    })
    res.json({ liked: true })
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle like" })
  }
})

// POST — add comment
router.post("/:id/comments", async (req, res) => {
  try {
    const { content } = req.body
    if (!content) return res.status(400).json({ error: "Content required" })

    const comment = await prisma.comment.create({
      data: {
        content,
        userId: req.userId,
        postId: parseInt(req.params.id)
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } }
      }
    })
    res.status(201).json(comment)
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment" })
  }
})

// DELETE — delete comment
router.delete("/:postId/comments/:commentId", async (req, res) => {
  try {
    const comment = await prisma.comment.findFirst({
      where: {
        id: parseInt(req.params.commentId),
        userId: req.userId
      }
    })
    if (!comment) return res.status(404).json({ error: "Comment not found" })

    await prisma.comment.delete({ where: { id: parseInt(req.params.commentId) } })
    res.json({ message: "Comment deleted" })
  } catch (error) {
    res.status(500).json({ error: "Failed to delete comment" })
  }
})

module.exports = router