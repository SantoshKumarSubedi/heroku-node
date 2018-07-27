var express=require('express');
var app=express();
var http=require('http').Server(app);
var io = require('socket.io')(http);
var uuid=require('uuid');
var bodyparser = require('body-parser');
var str=require('string');
var currentclient="";
var config={
  host:'ec2-54-235-196-250.compute-1.amazonaws.com',
  user:'ctgbfueakwwysi',
  database:'d8oo4il6eksd76',
  password:'4519e497edfdf54e0530880e42b7089c52531d7005c9766a338bda0acca51191',
  port:5432,
  max:10,
  ssl:true,
  idleTimeoutMillis:30000,
};
var DATABASE_URL="postgres://ctgbfueakwwysi:4519e497edfdf54e0530880e42b7089c52531d7005c9766a338bda0acca51191@ec2-54-235-196-250.compute-1.amazonaws.com/d8oo4il6eksd76"
var flag;
const pg = require('pg');
const pool=new pg.Pool(config);
app.use(bodyparser.urlencoded({extended:false}));
var clients=[];

app.get("/",function(req,res){
  res.sendFile(__dirname+'/login.html');
});

app.get("/login",function(req,res){
  res.sendFile(__dirname+'/login.html');
});
app.post("/signup",function(req,res){
  var email = req.body.email.toUpperCase();
  var username = req.body.username.toUpperCase();
  var password = req.body.password;
  pool.connect(function(err,client,done){
    if(err){
      return console.error('error fetching client from pool',err);
    }
    client.query("INSERT INTO public.users(username, password, email)VALUES ( '{"+username+"}','{"+password+"}', '{"+email+"}')",function(err,result){
      done();
      if(err){
        return console.error('error running query',err);
      }
      res.sendFile(__dirname+"/login.html")
    });
  });
});
app.get("/signup",function(req,res){
  res.sendFile(__dirname+'/signup.html')
});
app.post("/submit",function(req,res){
  flag=0;
var username=req.body.username.toUpperCase();
var password=req.body.password;
console.log("client provided user and pass"+username+":"+password);
pool.connect(function(err,client,done){
  if(err){
    return console.error('error fetching client from pool',err);
  }
  client.query('SELECT id,username,password,email FROM public.users',function(err,result){
    done();
    if(err){
      return console.error('error running query',err);
}
for(var i=0;i<result.rows.length;i++){

  var uname=result.rows[i].username.toString().trim();
  var pass=result.rows[i].password.toString().trim();
  console.log(uname+":"+pass);
  if(uname===username&&pass===password){
    flag=1;
    currentclient=uname;
    console.log(flag)
  }
}
if(flag==1){
  console.log('yes');
  res.sendFile(__dirname+"/index.html");
}else{
  console.log('noooo');
  res.sendFile(__dirname+"/login.html");
}

  });

});
});

io.on('connection',function(socket){
  console.log("client connected");
var client_uuid=uuid.v4();
var nickname=client_uuid.substr(0,8);
clients.push({"id":client_uuid,"ws":socket,"nickname":currentclient});
io.emit('chat message',nickname+" is connected");
updateuser();
socket.on('chat message',function(msg){
  var command=msg.split(";;");
  if(command[0]=="nick"){
    if(command.length>=2){
      var old_nickname=nickname;
      nickname=nickname=command[1];
      io.emit('chat message',"user "+old_nickname+" change nickname to "+nickname);
      for(i=0;i<clients.length;i++){

        if(clients[i].id==client_uuid){
          clients[i].nickname=nickname;
        }
      }
      updateuser();
    }
  }else{
  for(i=0;i<clients.length;i++){
    var client_socket=clients[i].ws;
    if(client_socket!=socket){
      client_socket.emit('chat message',nickname+">"+msg);
    }
  }
}
});

socket.on('disconnect',function(ev){
    for(var i=0;i<clients.length;i++){
      if(clients[i].id==client_uuid){
        console.log('client [%s] disconnected',nickname);
        clients.splice(i,1);
        updateuser();
      }
    }
    io.emit("chat message",nickname+"is disconnected");
  });

});
http.listen(process.env.PORT||8080,function(){
  console.log('listening on *:3000');
});
function updateuser(){
  var client=[];
  for(var i=0;i<clients.length;i++){
    client.push({"user":clients[i].nickname});

}
console.log(client);
io.emit("useractivity",JSON.stringify(client));
}
