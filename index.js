const express=require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser=require('body-parser');
const authMiddleware = require('./middleware/AuthMiddleware');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer=require('multer');
const fs=require('fs');
const path=require('path');
const app=express();
app.use(bodyParser.json());


MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) {
        console.error('Error connecting to MongoDB:', err);
        return;
    }

    console.log('Connected to MongoDB');
    const db = client.db("assisment");
    
});


    // Set up routes or other operations using the 'db' instance

  
    app.use(bodyParser.urlencoded({ extended: true })); // Add this line to parse URL-encoded bodies
    app.use(bodyParser.json());
    
    app.use(express.urlencoded({ extended: true }));
    const viewsPath = path.join(__dirname);
    
    app.set('view engine', 'ejs');
    app.set('views', viewsPath);
  

    app.get('/',(req,res)=>{
        res.render('templates/welcome');
    })
    app.get('/login',(req,res)=>{
        res.render('templates/login');
    })
    app.get('/register',(req,res)=>{
        res.render('templates/register');
    })

    app.post('/signup', async (req,res)=>{
       try{
        const email = req.body.email;
const name = req.body.name;
const phone = req.body.phone;
const role = req.body.role;
const image = req.body.image;
const password = req.body.password;
const saltRounds=10;
bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
    } else {
      // Save or use the hashedPassword
      console.log('Hashed Password:', hashedPassword);
    }
  });

        const existingUser = await db.collection('users').findOne({ $or: [{ email }, { phone }] });

            if (existingUser) {
                let data='email or phone number already existed';
                res.render('templates/register',{data});
            }
            const result = await db.collection('users').insertOne({
                email,
                name,
                phone,
                role,
                image,
                password: hashedPassword,
            });
        // Assuming the image is sent as a base64-encoded string

        // Decode the base64 image and save it to the file
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
    
        const imageName = email;
        const imagePath = 'profilepicture/'+imageName+".jpeg";
    
        // Save the new image, overwriting if it already exists
        fs.writeFileSync(imagePath, buffer);
        let data="registered"


            res.render('templates/register',{data});

       }catch(error){
        console.error('heere Error inserting user:', error);
            res.status(500).json({ error: 'Internal Server Error at register' });
       }
       
   });

   app.post('/login',async (req,res)=>{
    try{
        const {email,password,role}=req.body;

        const user=await db.collection('users').findOne({email});
        if(!user){
            let data="User not found"
            res.render("templates/login",{data});
        }else{
            const passwordMatch = await bcrypt.compare(password, user.password);
            if(!passwordMatch){
                let data="Password incorrect";
                res.render('templates/login',{data})
            }else{
                const token = jwt.sign({ email: user.email, password: user.password,role:user.role,number:user.number }, 'secret_key');
                res.json({ token });
                
                if(user.role=='admin'){
                    const result = await db.collection('users').find({ role: 'user' }).toArray();


                    res.render('templates/admin',{user,result});
                }else{
                    res.render('templates/user',{user});
                }
                
            }
        }
      }catch{
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
   });

   app.post('/usernamechange',authMiddleware,async (req,res)=>{
    try{
        const newName=req.body.name;

        const result = await db.collection('users').updateOne(
            { email: req.user.email, password: req.user.password },
            { $set: { name: newName } }
          );
          if (result.modifiedCount === 1) {
            res.render('templates/user',{user})
        } else {
            res.status(400).json({ success: false, message: 'Failed to update username' });
        }
    }catch{
        console.log('change name error caught');
    }


   })


   app.post('adminchange',authMiddleware,(req,res)=>{
    try{
        const useremail=req.body.email;
        const newName=req.body.name;
        if(user.role='admin'){
            const result=db.collection("users").updateOne({email:email},
                {$set:{name:newName}});
                if (!result){
                    let data="Unable to update"
                    res.render('templates/admin',{user,data})
                }
                let data="updated"
                res.render('templates/admin',{user,data})
        }
    }catch{
        console.log("error in admin change");
    }
   })

   app.post('/delete',authMiddleware,(req,res)=>{
    try{
        const result=db.collection('users').deleteOne({email});
        let data="deleted";
        res.render('templates/admin',{users,data})
    }catch{
        console.log("error delete");
    }
   })

   app.post('/profileimagechange',authMiddleware,(req,res)=>{
    try{
        const image = req.body.image; // Assuming the image is sent as a base64-encoded string

        // Decode the base64 image and save it to the file
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
    
        const imageName = req.user.email
        const imagePath = 'profilepicture/'+imageName+".jpeg";
    
        // Save the new image, overwriting if it already exists
        fs.writeFileSync(imagePath, buffer);

    }catch{
        console.log("error at profile change");
    }

   })






   

  
    app.listen(8080, () => {
    console.log('Server is running on http://localhost:8080');
})