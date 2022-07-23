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
    const ordersCollection = client.db("professional-aws").collection("orders");

    // verify Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const requester = await usersCollection.findOne({ email: email });
      if (requester.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    };

    // verify Moderator
    const verifyModerator = async (req, res, next) => {
      const email = req.decoded.email;
      const requester = await usersCollection.findOne({ email: email });
      if (requester.role === "moderator" || requester.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    };

    // order
    app.post("/order", async (req, res) => {
      const info = req.body;
      const result = await ordersCollection.insertOne(info);
      res.send(result);
    });

    // user order
    app.get("/userOrder/:email", async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    // all Orders
    app.get("/allOrders", verifyJWT, verifyModerator, async (req, res) => {
      const result = await ordersCollection.find({}).toArray();
      res.send(result);
    });

    // allOrders
    app.post("/allOrders", verifyJWT, verifyModerator, async (req, res) => {
      const page = parseInt(req.query.page);
      const count = parseInt(req.query.size);
      let query = {};
      const result = ordersCollection.find(query);
      let orders;
      if (page || count) {
        orders = await result
          .skip(page * count)
          .limit(count)
          .toArray();
      } else {
        orders = await result.toArray();
      }
      res.send(orders);
    });

    // search Order
    app.get("/searchOrder/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.findOne(query);
      res.send(result);
    });

    // orders Counter
    app.get("/ordersCounter", async (req, res) => {
      const count = await ordersCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // delete order
    app.delete("/deleteOrder/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.decoded.email;
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const requester = await usersCollection.findOne({ email: email });
      if (requester?.role === "admin") {
        const result = await ordersCollection.deleteOne(query);
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });

    app.get("/counter", async (req, res) => {
      const count = await productsCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/blog-counter", async (req, res) => {
      const count = await blogsCollection.estimatedDocumentCount();
      res.send({ count });
    });

    app.get("/users", verifyJWT, verifyModerator, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // /all admin
    app.get("/admin", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "admin" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // check admin
    app.get("/is-admin/:email", verifyJWT, verifyModerator, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      const isAdmin = result?.role === "admin";
      res.send({ admin: isAdmin });
    });

    // check is-notUser
    app.get("/is-notUser/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      const isNotUser = result?.role !== "user";
      res.send({ isUser: isNotUser });
    });

    app.delete("/deleteUser/:id", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const requester = await usersCollection.findOne({ email: email });
      if (requester?.role === "admin") {
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });

    // make Role
    app.post("/makeRole/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const role = req.body;
      filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: role,
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
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

    // useProducts
    app.post("/cart-products", async (req, res) => {
      const keys = req.body;
      const ids = keys.map((id) => ObjectId(id));
      let query = { _id: { $in: ids } };
      const cursor = productsCollection
        .find(query)
        .project({ productName: 1, quantity: 1, price: 1, images: 1 });
      const result = await cursor.toArray();

      res.send(result);
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

    // blogs details
    app.get("/blog-details/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await blogsCollection.findOne(query);
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

    // token and user create
    app.put("/user/:email", async (req, res) => {
      const user = req.params.email;
      let info = req.body;
      const exist = await usersCollection.findOne({ email: user });
      let filter = { email: user };
      const options = { upsert: true };
      if (!exist) {
        const updateDoc = {
          $set: info,
        };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({ email: user }, process.env.ACCESS_TOKEN, { expiresIn: "1d" });
        res.send({ result, token });
      } else {
        let infoData = {
          email: info.email,
          displayName: info.displayName,
          photoURL: info.photoURL,
          lastLoginDate: info.joiningDate,
        };
        const updateDoc = {
          $set: infoData,
        };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({ email: user }, process.env.ACCESS_TOKEN, { expiresIn: "1d" });
        res.send({ result, token });
      }
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
