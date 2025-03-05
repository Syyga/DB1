import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";
import Article from "./models/Article.js";

dotenv.config();
const PORT = process.env.PORT || 10000;
const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://db-1-45k6.onrender.com",
];

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  })
);

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("MongoDB 연결 성공!"))
  .catch((err) => console.error("MongoDB 연결 실패:", err));

app.get("/", (req, res) => res.send("API 정상 동작 중!"));

// 상품 API
app.post("/api/products", async (req, res) => {
  const { name, description, price, tags } = req.body;
  if (!name || !description || !price || !tags) {
    return res.status(400).send("name, description, price, tags는 필수입니다.");
  }
  try {
    const product = await Product.create({ name, description, price, tags });
    res.status(201).send(product);
  } catch (error) {
    res.status(500).send({ message: "상품 등록 실패", error });
  }
});

app.get("/api/products", async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const query = search
    ? {
        $or: [
          { name: new RegExp(search, "i") },
          { description: new RegExp(search, "i") },
        ],
      }
    : {};

  try {
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.status(200).send({ total, products });
  } catch (error) {
    res.status(500).send({ message: "상품 조회 실패", error });
  }
});

app.patch("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!product)
      return res.status(404).send({ message: "상품을 찾을 수 없습니다." });
    res.status(200).send(product);
  } catch (error) {
    res.status(500).send({ message: "상품 수정 실패", error });
  }
});

app.post("/api/articles", async (req, res) => {
  const { title, content, username, image } = req.body;
  try {
    const article = await Article.create({ title, content, username, image });
    res.status(201).send(article);
  } catch (error) {
    res.status(500).send({ message: "게시글 등록 실패", error });
  }
});

// 게시글 API
app.post("/api/articles", async (req, res) => {
  const { title, content } = req.body;
  try {
    const article = await Article.create({ title, content });
    res.status(201).send(article);
  } catch (error) {
    res.status(500).send({ message: "게시글 등록 실패", error });
  }
});

app.get("/api/articles", async (req, res) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 });
    res.status(200).send(articles);
  } catch (error) {
    res.status(500).send({ message: "게시글 조회 실패", error });
  }
});

app.patch("/api/articles/:id", async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!article)
      return res.status(404).send({ message: "게시글을 찾을 수 없습니다." });
    res.status(200).send(article);
  } catch (error) {
    res.status(500).send({ message: "게시글 수정 실패", error });
  }
});

app.delete("/api/articles/:id", async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article)
      return res.status(404).send({ message: "게시글을 찾을 수 없습니다." });
    res.status(200).send({ message: "게시글 삭제 성공" });
  } catch (error) {
    res.status(500).send({ message: "게시글 삭제 실패", error });
  }
});

// 댓글 등록 API (게시글 내 댓글 배열에 저장)
app.post("/api/articles/:articleId/comments", async (req, res) => {
  const { content, username } = req.body;

  if (!content || !username) {
    return res.status(400).send("content, username은 필수입니다.");
  }

  try {
    const article = await Article.findById(req.params.articleId);
    if (!article) {
      return res.status(404).send({ message: "게시글을 찾을 수 없습니다." });
    }

    article.comments.push({ content, username });
    await article.save();

    const newComment = article.comments[article.comments.length - 1];
    res.status(201).send(newComment);
  } catch (error) {
    res.status(500).send({ message: "댓글 등록 실패", error });
  }
});

app.get("/api/articles/:articleId/comments", async (req, res) => {
  const { articleId } = req.params;

  try {
    const article = await Article.findById(articleId);

    if (!article)
      return res.status(404).send({ message: "게시글을 찾을 수 없습니다." });

    const comments = article.comments.sort((a, b) => b.createdAt - a.createdAt);

    res.status(200).send(comments);
  } catch (error) {
    res.status(500).send({ message: "댓글 조회 실패", error });
  }
});

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중`);
});
// 댓글 수정
app.patch("/api/articles/:articleId/comments/:commentId", async (req, res) => {
  try {
    const { articleId, commentId } = req.params;
    const { content } = req.body;

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).send({ message: "게시글을 찾을 수 없습니다." });
    }

    const comment = article.comments.id(commentId);
    if (!comment) {
      return res.status(404).send({ message: "댓글을 찾을 수 없습니다." });
    }

    if (content !== undefined) {
      comment.content = content;
      comment.updatedAt = new Date();
    }

    await article.save();

    res.status(200).send(comment);
  } catch (error) {
    res.status(500).send({ message: "댓글 수정 실패", error });
  }
});

// 댓글 삭제
app.delete("/api/articles/:articleId/comments/:commentId", async (req, res) => {
  try {
    const { articleId, commentId } = req.params;

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).send({ message: "게시글을 찾을 수 없습니다." });
    }

    const comment = article.comments.id(commentId);
    if (!comment) {
      return res.status(404).send({ message: "댓글을 찾을 수 없습니다." });
    }

    article.comments.pull(commentId);
    await article.save();

    res.status(200).send({ message: "댓글 삭제 성공" });
  } catch (error) {
    res.status(500).send({ message: "댓글 삭제 실패", error });
  }
});
