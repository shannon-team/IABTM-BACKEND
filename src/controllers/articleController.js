import Article from "../models/articleModel.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Expert from "../models/expertModel.js";
import SuperAdmin from "../models/superAdminModel.js";

// Create Article
export const createArticle = async (req, res) => {
  try {
    const { title, content, publishStatus, category, tags, role } = req.body;
    const userId = req.user.id;

    if ([title, content, category].some((field) => field?.trim() === "")) {
      return res.status(400).json(new ApiResponse(400, "Title, content, and category are required."));
    }

    let user;
    if (role === 'expert') {
      user = await Expert.find({ user: userId });
      console.log(user)

    } else if (role === 'superAdmin') {
      user = await SuperAdmin.find({ user: userId });
    }

    const requiredId = user[0]._id
    console.log('required id - ', requiredId)
    if (!requiredId) {
      return res.status(404).json(new ApiResponse(404, `User with role ${role} not found`));
    }

    const article = new Article({
      postedBy: {
        id: requiredId,
        role: role
      },
      title,
      content,
      publishStatus: publishStatus || false,
      category,
      tags: tags ? tags.split(",") : [], // Assuming tags are sent as a comma-separated string
    });

    await article.save();

    return res.status(201).json(new ApiResponse(201, "Article created successfully", article));
  } catch (error) {
    console.error("Error creating article:", error);
    return res.status(500).json(new ApiError(500, "Error creating article", error));
  }
};

// Get All Articles
export const getArticles = async (req, res) => {
  try {
    const { role } = req.body;

    const filter = {};
    if (role) {
      filter['postedBy.role'] = role;
    }

    const articles = await Article.find(filter);
    return res
      .status(200)
      .json(new ApiResponse(200, "Articles fetched successfully", articles));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Error fetching articles", error));
  }
};

// Get Article by ID
export const getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    console.log(article)
    if (!article) {
      return res.status(404).json(new ApiResponse(404, "Article not found"));
    }

    return res.status(200).json(new ApiResponse(200, "Article fetched successfully", article));
  } catch (error) {
    return res.status(500).json(new ApiError(500, "Error fetching article", error));
  }
};

// Update Article
export const updateArticle = async (req, res) => {
  try {
    const { title, content, publishStatus, category, tags } = req.body;

    const article = await Article.findById(req.params.id);
    if (!article ) {
      return res.status(404).json(new ApiResponse(404, "Article not found or unauthorized access"));
    }

    article.title = title || article.title;
    article.content = content || article.content;
    article.publishStatus = publishStatus ?? article.publishStatus;
    article.category = category || article.category;
    article.tags = tags ? tags.split(",") : article.tags;

    await article.save();

    return res.status(200).json(new ApiResponse(200, "Article updated successfully", article));
  } catch (error) {
    return res.status(500).json(new ApiError(500, "Error updating article", error));
  }
};

// Delete Article
export const deleteArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article ) {
      return res.status(404).json(new ApiResponse(404, "Article not found or unauthorized access"));
    }

    await article.deleteOne();

    return res.status(200).json(new ApiResponse(200, "Article deleted successfully"));
  } catch (error) {
    console.log(error)
    return res.status(500).json(new ApiError(500, "Error deleting article", error));
  }
};

// Track Article View
export const trackArticleView = async (req, res) => {
  try {
    const { articleId } = req.body;
    const userId = req.user.id;

    const article = await Article.findById(articleId).populate('viewedBy', 'name email');
    if (!article) {
      return res.status(404).json(new ApiResponse(404, 'Article not found'));
    }

    if (article.postedBy.id === userId) {
      return res.status(400).json(new ApiResponse(400, 'Creator cannot be counted as a viewer'));
    }

    const alreadyViewed = article.viewedBy.some((viewer) => viewer.toString() === userId);
    if (!alreadyViewed) {
      article.viewedBy.push(userId);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastView = article.views.find((view) => view.dateViewed.getTime() === today.getTime());
      if (lastView) {
        lastView.count += 1;
      } else {
        article.views.push({ count: 1, dateViewed: today });
      }

      await article.save();

      return res.status(200).json(new ApiResponse(200, {
        totalViews: article.views.reduce((sum, view) => sum + view.count, 0),
        latestViewDate: article.views[article.views.length - 1]?.dateViewed,
      }, 'View tracked successfully'));
    }

    return res.status(200).json(new ApiResponse(200, "Already viewed by this user"));
  } catch (error) {
    console.error('Error tracking article view:', error);
    return res.status(500).json(new ApiError(500, "Error tracking article view", error));
  }
};

// Get Article Views
export const getArticleViews = async (req, res) => {
  try {
    const { articleId } = req.body;

    const article = await Article.findById(articleId).populate('viewedBy', 'name email');
    if (!article) {
      return res.status(404).json(new ApiResponse(404, 'Article not found'));
    }

    return res.status(200).json(new ApiResponse(200, {
      totalViews: article.views.reduce((sum, view) => sum + view.count, 0),
      latestViewDate: article.views[article.views.length - 1]?.dateViewed,
      uniqueViewers: article.viewedBy.length,
      viewers: article.viewedBy,
    }, 'View statistics fetched successfully'));
  } catch (error) {
    console.error('Error fetching view statistics:', error);
    return res.status(500).json(new ApiError(500, "Error fetching view statistics", error));
  }
};