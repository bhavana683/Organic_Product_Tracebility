const { Oauth2Client, oauth2client } = require("../utils/googleConfig");
const bcrypt=require("bcryptjs")
const jwt=require("jsonwebtoken")
const User=require("../models/user")
const axios= require('axios')
require('dotenv').config()
const googleLogin = async (req, res) => {
 
 try{
 const {code}=req.query;
 const googleRes=await oauth2client.getToken(code)
 oauth2client.setCredentials(googleRes.tokens)
 const userRes=await axios.get( `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`)
const {email,name,picture}=userRes.data; 
const username=email

const pass=`${username}@123`
const password=await bcrypt.hash(pass, 10);
let user=await User.findOne({username});
if(!user){
  user=await User.create({
    name,username,password,image:picture
  })
}
const{_id}=user;
 const token=jwt.sign(
      {id:user._id},
      process.env.JWT_SECRET,
      {expiresIn:"1h"}

     
    )
     //req.session.userEmail = username;
    //req.session.userId = user._id;
    return ( res.status(200).json({message:'success',token,
      user
    }))
}
 catch(err){
  console.log(err)
res.status(500).json({message:'internal error'})
 }
};
module.exports={
  googleLogin
}