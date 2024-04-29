const express= require('express')
const app=express()
const jwt=require('jsonwebtoken')
const cors= require('cors')
require('dotenv').config()
const cookieParser= require('cookie-parser')
const port= process.env.PORT || 7000;

app.use(cors())
app.use(express.json())
app.use(cookieParser())




//--------------------------MONGODB ATLAS DATABASE


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USERDB_NAME}:${process.env.USERDB_PASSWORD}@cluster0.shxdugw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    //user server -----------
    const userCollection = client.db("DIU-83").collection('allUser');
    const productCollection_1 = client.db("DIU-83").collection('products-1-collection');
    const reviewCollection = client.db("DIU-83").collection('reviewProduct');
    const cartsCollection = client.db("DIU-83").collection('carts');


    //jwt token setup
    app.post('/jwt', async(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user, 'ACCESS_TOKEN_SECRET',{expiresIn:'1h'})
      res.send({token})
    })

    // user collection------
    app.get('/user', async(req,res)=>{
      const result= await userCollection.find().toArray()
      res.send(result)
    })

    app.post('/user', async(req,res)=>{
      const users=req.body;
      //social login data base collection
      const query= {email:users.email}
      const exitingUser= await userCollection.findOne(query)
      if(exitingUser){
        return res.send({message:'User already exist',insertedId:null})
      }
      const result= await userCollection.insertOne(users);
      res.send(result)
    })

    app.patch('/user/admin/:id', async(req,res)=>{
      const id=req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc={
        $set:{
         role: 'admin'
        }
      }
      const result= await userCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.delete('/user/:id', async(req,res)=>{
      const id=req.params.id;
      const query= {_id: new ObjectId(id)}
      const result= await userCollection.deleteOne(query)
      res.send(result)
    })


    //user collection end------
    
    app.get('/product1', async(req,res)=>{
        const result= await productCollection_1.find().toArray();
        res.send(result)
    })
    //review collection
    app.get('/review', async(req,res)=>{
      const result= await reviewCollection.find().toArray();
      res.send(result)
    })

    // add to Cart database
    app.get('/carts', async(req,res)=>{
      const email= req.query.email;
      const query={email:email}
      const result= await cartsCollection.find(query).toArray();
      res.send(result)

    })

    app.post('/carts', async (req,res)=>{
      const cartItems= req.body;
      const result= await cartsCollection.insertOne(cartItems)
      res.send(result)
    })

    app.delete('/carts/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result= await cartsCollection.deleteOne(query)
      res.send(result)
    })





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res)=>{
    res.send('Diu 83 Batch Ashik Elias Joyanto Maria')
})
app.listen(port,()=>{
    console.log(`Diu Scouqid are comming port ${port}`)
})

