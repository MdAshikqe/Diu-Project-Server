const express= require('express')
const app=express()
const SSLCommerzPayment = require('sslcommerz-lts')
const jwt=require('jsonwebtoken')
const cors= require('cors')
require('dotenv').config()
const cookieParser= require('cookie-parser')
const mailgun = require("mailgun-js");
const DOMAIN = "sandbox4c8fbf1523684f779962c3f7240b61be.mailgun.org";
const mg = mailgun({apiKey: process.env.MAIL_GUN_API_KEY, domain: DOMAIN});



// const formData = require('form-data');
// const Mailgun = require('mailgun.js');
// const mailgun = new Mailgun(formData);
// const mg = mailgun.client({
//   username: 'api',
//   key: process.env.MAIL_GUN_API_KEY,
// });



const port= process.env.PORT || 7000;

app.use(cors())
app.use(express.json())
app.use(cookieParser())




//--------------------------MONGODB ATLAS DATABASE


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const SslCommerzPayment = require('sslcommerz-lts/api/payment-controller')
const uri = `mongodb+srv://${process.env.USERDB_NAME}:${process.env.USERDB_PASSWORD}@cluster0.shxdugw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false //true for live, false for sandbox

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    //user server -----------
    const userCollection = client.db("DIU-83").collection('allUser');
    const productCollection_1 = client.db("DIU-83").collection('products-1-collection');
    const reviewCollection = client.db("DIU-83").collection('reviewProduct');
    const cartsCollection = client.db("DIU-83").collection('carts');
    const orderCollection = client.db("DIU-83").collection('order');

// payment details
const tran_id = new ObjectId().toString();

app.post('/order', async(req,res)=>{
  const email= req.query.email;
  const query={email:email}
  const product= await cartsCollection.find(query).toArray();


  const paymentInfo=req.body;
    const paymentDocs = {
      name: paymentInfo.name,
      email: paymentInfo.email,
      phone:paymentInfo.phone,
      price:parseFloat(paymentInfo.price),
      address:paymentInfo.address,
      currency:paymentInfo.currency,
      date:paymentInfo.date
    }

    
  const data = {
    total_amount: paymentDocs.price,
    currency: paymentDocs.currency,
    tran_id: tran_id, // use unique tran_id for each api call
    success_url: `http://localhost:7000/order/success/${tran_id}`,
    fail_url: `http://localhost:7000/order/failed/${tran_id}`,
    cancel_url: `http://localhost:7000/order/failed/${tran_id}`,
    ipn_url: 'http://localhost:3030/ipn',
    shipping_method: 'Courier',
    product_name: 'Computer.',
    product_category: 'Electronic',
    product_profile: 'general',
    cus_name: paymentDocs.name,
    cus_email:paymentDocs.email,
    cus_add1: 'Dhaka',
    cus_add2: 'Dhaka',
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: paymentDocs.phone,
    cus_fax: '01711111111',
    ship_name: 'Customer Name',
    ship_add1: paymentDocs.address,
    ship_add2: 'Dhaka',
    ship_city: 'Dhaka',
    ship_state: 'Dhaka',
    ship_postcode: 1000,
    ship_country: 'Bangladesh',
};
const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
sslcz.init(data).then(apiResponse => {
    // Redirect the user to payment gateway
    let GatewayPageURL = apiResponse.GatewayPageURL
    res.send({url: GatewayPageURL})

    const finalOrder={
      product,
      paidStatus:false,
      transjectionId:tran_id,
      name: paymentInfo.name,
      email: paymentInfo.email,
      phone:paymentInfo.phone,
      price:parseFloat(paymentInfo.price),
      address:paymentInfo.address,
      currency:paymentInfo.currency,
      date:paymentInfo.date
  
    }
    const result= orderCollection.insertOne(finalOrder)
    // res.send(result)
    console.log(result)
    



    console.log('Redirecting to: ', GatewayPageURL)
});

//success payment

app.post('/order/success/:transId',async(req,res)=>{
  const result =await orderCollection.updateOne(
    {transjectionId: req.params.transId},
    {
      $set:{
        paidStatus:true
      }
    }
  );

  if(result.modifiedCount >0){
    // send user email about payment confirmation
    // mg.messages
    // .create(process.env.MAIL_SENDING_DOMAIN, {
    //   from: "Mailgun Sandbox <postmaster@sandboxa651eaa56d454b9a95969c43ce3a3c31.mailgun.org>",
    //   to: ["asikhosen865575@gmail.com"],
    //   subject: "E-SHOP Order Confirmation",
    //   text: "Testing some Mailgun awesomness!",
    //   html: `
    //     <div>
    //       <h2>Thank you for your order</h2>
    //       <h4>Your Transaction Id: <strong>id hera </strong></h4>
    //       <p>We would like to get your feedback about the food</p>
    //     </div>
    //   `
    // })
    // .then(msg => console.log(msg)) // logs response data
    // .catch(err => console.log(err)); // logs any error`;

    const data = {
      from: "Mailgun Sandbox <postmaster@sandbox4c8fbf1523684f779962c3f7240b61be.mailgun.org>",
      to: "ahkctr1234@gmail.com",
      subject: "Hello",
      text: "Testing some Mailgun awesomness!"
    };
  
mg.messages().send(data, function (error, body) {
	console.log(body);
})

    res.redirect(`http://localhost:5173/dashboard/order/success/${req.params.transId}`)
     
    
  }
 

  

});



//failed payment
app.post('/order/failed/:transId',async(req,res)=>{
  const result =await orderCollection.deleteOne(
    {transjectionId: req.params.transId}
  );
  if(result.deletedCount){
    res.redirect(`http://localhost:5173/order/failed/${req.params.transId}`)
  }

});

})




app.get('/order/success/:email', async (req, res) => {
  const query = { email: req.params.email }
  // if (req.params.email !== req.decoded.email) {
  //   return res.status(403).send({ message: 'forbidden access' });
  // }
  const result = await orderCollection.find(query).toArray();
  res.send(result);
})



    //jwt token setup
    app.post('/jwt', async(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'})
      res.send({token})
    })

    //midleWare set verifyToken 
    const verifyToken= (req,res,next)=>{
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'})
      }
      const token=req.headers.authorization.split(' ')[1];
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
        if(err){
          return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded=decoded;
        next()
        
      })
    }
    //admin verify after verify token midleWare
    const verifyAdmin= async (req,res,next)=>{
      const email= req.decoded.email;
      const query= {email:email}
      const user= await userCollection.findOne(query)
      const isAdmin= user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'})
      }
      next();
    }
    
    //email search for admin
    app.get('/user/admin/:email',verifyToken, async(req,res)=>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const query= {email: email}
      const user= await userCollection.findOne(query)
      let admin=false;
      if(user){
        admin= user?.role === 'admin';
      }
      res.send({admin})
  
    })

    // user collection------
    app.get('/user',verifyToken, async(req,res)=>{
      
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


    app.patch('/user/admin/:id',verifyToken,verifyAdmin,async(req,res)=>{
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

    app.delete('/user/:id',verifyToken, async(req,res)=>{
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

    app.get('/product1/:id', async(req,res)=>{
      const id= req.params.id;
      const query= {_id: new ObjectId(id)}
      const result= await productCollection_1.findOne(query)
      res.send(result)
    } )

    app.patch('/product1/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const item=req.body;
      const id=req.params.id;
      const filter= {_id: new ObjectId(id)}
      const updateDoc={
        $set: {
          name:item.name,
          category: item.category,
          price: item.price,
          img: item.img,
          stock:item.stock,
          shipping:item.shipping

        }
      }
      const result= await productCollection_1.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.post('/product1', async(req,res)=>{
      const item=req.body;
      const result= await productCollection_1.insertOne(item);
      res.send(result);
    })

    app.delete('/product1/:id', async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result= await productCollection_1.deleteOne(query)
      res.send(result)

    })
    
    //review collection
    app.get('/review', async(req,res)=>{
      const result= await reviewCollection.find().toArray();
      res.send(result)
    })

    // add to Cart database
    app.get('/carts',async(req,res)=>{
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

    app.delete('/carts/:id', async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result= await cartsCollection.deleteOne(query)
      res.send(result)
    })


    //admin analaytic
    app.get('/admin-stats',async(req,res)=>{
      const usersAll= await userCollection.estimatedDocumentCount();
      const productItems= await productCollection_1.estimatedDocumentCount();
      const orders= await orderCollection.estimatedDocumentCount();

      const result = await orderCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: '$price'
            }
          }
        }
      ]).toArray();
      const revenue = result.length > 0 ? result[0].totalRevenue : 0;


      res.send({
        usersAll,
        productItems,
        orders,
        revenue
      })
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

