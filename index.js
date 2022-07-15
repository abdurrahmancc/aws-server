const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
var jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

app.use(
  cors({
    credentials: true,
    crossDomain: true,
    origin: [
      "https://aws-ac1fd.web.app",
      "http://localhost:3000",
      "https://aws-ac1fd.firebaseapp.com",
    ],
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.1fj60.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access...." });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

const run = async () => {
  try {
    await client.connect();
    const usersCollection = client.db("professional-aws").collection("users");
    const blogsCollection = client.db("professional-aws").collection("blogs");
    const productsCollection = client.db("professional-aws").collection("products");

    app.get("/counter", async (req, res) => {
      const count = await productsCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/blog-counter", async (req, res) => {
      const count = await blogsCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/user", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      console.log(decodedEmail);
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // shop all-products
    app.post("/all-products", async (req, res) => {
      const category = req.body;
      // console.log(info);
      const page = parseInt(req.query.page);
      const count = parseInt(req.query.size);
      let query;
      if (category.length) {
        query = { category: { $in: category } };
      } else {
        query = {};
      }
      const result = productsCollection.find(query);
      // console.log(result);
      let products;
      if (page || count) {
        products = await result
          .skip(page * count)
          .limit(count)
          .toArray();
      } else {
        products = await result.toArray();
      }
      res.send(products);
    });

    app.get("/categories/:category", async (req, res) => {
      const category = req.params.category;
      const page = parseInt(req.query.page);
      const count = parseInt(req.query.size);
      let query = { category: category };
      const result = productsCollection.find(query);
      let products;
      if (page || count) {
        products = await result
          .skip(page * count)
          .limit(count)
          .toArray();
      } else {
        products = await result.toArray();
      }
      res.send(products);
    });

    // /product-details
    app.get("/product-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    app.get("/home-LCM/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // home-bestProducts
    app.get("/home-bestProducts/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // home-electronic
    app.get("/home-electronic/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // home-electronic
    app.get("/home-watch/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // home-phone
    app.get("/home-phone/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/add-product", verifyJWT, async (req, res) => {
      const info = req.body;
      const result = await productsCollection.insertOne(info);
      res.send(result);
    });

    // blogs Collection
    app.post("/addBlog", verifyJWT, async (req, res) => {
      const info = req.body;
      const result = await blogsCollection.insertOne(info);
      res.send(result);
    });

    // blogs
    app.get("/blogs", async (req, res) => {
      const page = parseInt(req.query.page);
      const count = parseInt(req.query.size);
      const result = await blogsCollection.find({});
      let items;
      if (page || count) {
        items = await result
          .skip(page * count)
          .limit(count)
          .toArray();
      } else {
        items = await result.toArray();
      }
      res.send(items);
    });

    app.get("/categories/:category", async (req, res) => {
      const category = req.params.category;
      const page = parseInt(req.query.page);
      const count = parseInt(req.query.size);
      let query = { category: category };
      const result = productsCollection.find(query);
      let products;
      if (page || count) {
        products = await result
          .skip(page * count)
          .limit(count)
          .toArray();
      } else {
        products = await result.toArray();
      }
      res.send(products);
    });

    //product-delete
    app.delete("/product-delete/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/user/:email", async (req, res) => {
      const user = req.params.email;
      const info = req.body;
      filter = { email: user };
      const options = { upsert: true };
      const updateDoc = {
        $set: info,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: user }, process.env.ACCESS_TOKEN, { expiresIn: "1d" });
      res.send({ result, token });
    });
  } finally {
    // client.close()
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("running profession-aws");
});

app.listen(port, () => {
  console.log("running port", port);
});
