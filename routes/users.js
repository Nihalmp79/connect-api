const express = require("express")
const { PrismaClient } = require("@prisma/client")

const router = express.Router()
const prisma = new PrismaClient()

// GET user profile
router.get("/:username", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        createdAt: true,
        posts: {
          orderBy: { createdAt: "desc" },
          include: {
            likes: true,
            _count: { select: { likes: true, comments: true } }
          }
        },
        _count: {
          select: { followers: true, following: true, posts: true }
        }
      }
    })
    if (!user) return res.status(404).json({ error: "User not found" })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" })
  }
})

// GET current logged in user
router.get("/me/profile", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        _count: {
          select: { followers: true, following: true, posts: true }
        }
      }
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" })
  }
})

// PUT — update profile
router.put("/me/profile", async (req, res) => {
  try {
    const { bio, avatar } = req.body
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { bio, avatar },
      select: {
        id: true, username: true, email: true, bio: true, avatar: true
      }
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" })
  }
})

// POST — follow/unfollow user
router.post("/:id/follow", async (req, res) => {
  try {
    const followingId = parseInt(req.params.id)

    if (followingId === req.userId) {
      return res.status(400).json({ error: "Cannot follow yourself" })
    }

    // check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.userId,
          followingId
        }
      }
    })

    if (existing) {
      // unfollow
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: req.userId,
            followingId
          }
        }
      })
      return res.json({ following: false })
    }

    // follow
    await prisma.follow.create({
      data: { followerId: req.userId, followingId }
    })
    res.json({ following: true })
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle follow" })
  }
})

// GET followers list
router.get("/:id/followers", async (req, res) => {
  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: parseInt(req.params.id) },
      include: {
        follower: {
          select: { id: true, username: true, avatar: true, bio: true }
        }
      }
    })
    res.json(followers.map(f => f.follower))
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch followers" })
  }
})

// GET following list
router.get("/:id/following", async (req, res) => {
  try {
    const following = await prisma.follow.findMany({
      where: { followerId: parseInt(req.params.id) },
      include: {
        following: {
          select: { id: true, username: true, avatar: true, bio: true }
        }
      }
    })
    res.json(following.map(f => f.following))
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch following" })
  }
})

module.exports = router