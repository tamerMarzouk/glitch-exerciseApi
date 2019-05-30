const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI ,{useNewUrlParser: true})
var db=mongoose.connection;
db.on('error',()=>{
  console.log('DB Error');
});
db.once('open',()=>{
  console.log('DB Connection success!');
})

var usernameSchema=new mongoose.Schema({userName:{type:String,required:true,unique:true}});
var userExcersiseSchema=new mongoose.Schema({
  userId:{type:String,required:true},
  description:{type:String,required:true},
  duration:{type:Number,required:true},
  date:{type:Date,required:false},
})

var usernameModel=mongoose.model('Username',usernameSchema);
var userExcersiseModel=mongoose.model('Exercise',userExcersiseSchema);
app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/exercise/log',(req,res)=>{
  //http parameters are userId, from, to, and limit
  let userId=req.query.userId?req.query.userId:'';
  let query={
    userId:userId,   
  };
  let from=req.query.from?req.query.from:'';
  let to=req.query.to?req.query.to:'';
  let limit=req.query.limit?parseInt(req.query.limit):0;
  if(from!='' ||to!=''){
    query.date={};
  }
  if(from!='') query.date.$gte=from;
  if(to!='')query.date.$lte=to;
  
  if(userId==='') {
    res.send('userId not supplied');
    return;
  }
  var responseResult={};
  usernameModel.findOne({_id:userId}).exec((err,userResult)=>{
    responseResult={_id:userResult._id,username:userResult.userName};
console.log(userResult)
  userExcersiseModel.find(query,{description:1,duration:1,date:1,_id:0}).limit(limit).exec((err,result)=>{
    responseResult.count=result.length;
    responseResult.log=result;
    console.log(err,result);
    res.send(responseResult);
  })
  
});
});
app.post('/api/exercise/new-user',(req,res)=>{
  console.log(req.body)
  let user=new usernameModel({userName:req.body.username})
  user.save((err,data)=>{
    if(err) {console.log(err);
             res.send('username already used, please choose another username!');}
    else res.send({_id:data._id,username:data.userName})
      
  });
});

app.post('/api/exercise/add',(req,res)=>{
  console.log(req.body)
   usernameModel.findOne({_id:req.body.userId}).exec((err,userResult)=>{
     if(err) {
       res.send('Data error!!');
       return;
     }
  let userexercise=new userExcersiseModel({
    userId:req.body.userId,
    
    description:req.body.description,
    duration:req.body.duration,
    date:req.body.date,
  
  })
  userexercise.save((err,data)=>{
    if(err) {console.log(err);
             res.send('Data error!!');}
    else res.send({_id:data.userId,username:userResult.userName,description:data.description,duration:data.duration,date:data.date})
      
  });
});
  
});


// Any other request will be Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
