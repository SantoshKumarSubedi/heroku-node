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
var reports=[];
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
  res.sendFile(__dirname+'/sign.html')
});
app.get("/background.jpg",function(req,res){
  res.sendFile(__dirname+'/background.jpg')
});
app.get("/logo.png",function(req,res){
  res.sendFile(__dirname+'/logo.png')
});


app.get("/term",function(req,res){
  res.sendFile(__dirname+'/term.html')
});

app.get("/back1.jpg",function(req,res){
  res.sendFile(__dirname+'/back1.jpg')
});
app.get("/back.jpeg",function(req,res){
  res.sendFile(__dirname+'/back.jpg')
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
  var reported=0;
  console.log("client connected");
var client_uuid=uuid.v4();
var nickname=currentclient;
clients.push({"id":client_uuid,"ws":socket,"nickname":nickname});
var msg=" is connected"
io.emit('userconnected',JSON.stringify({'nickname':nickname,'message':msg}));
updateuser();
socket.on('chat message',function(msg){
  var command=msg.split(";;");
if(command[0]=="pm"){
    var feedback="user not found";
    if(command.length>=3){
      var pm_to=command[1].toUpperCase();
      for(i=0;i<clients.length;i++){
        if(clients[i].nickname==pm_to){
          console.log("username found")
          var client_socket=clients[i].ws;
          client_socket.emit('chat message',JSON.stringify({'nickname':nickname,"message":command[2]}));
          feedback="sent"
        }
      }

    }else{
      feedback="not enough argument"
    }
    if(feedback!=="sent"){
    socket.emit('errors',JSON.stringify({'status':nickname,'message':feedback}));
}
}else if(command[0]=="report"){
  var feedback="user not found";
  var flag=0;
  if(command.length>=2){
    var reported_user=command[1].toUpperCase();
    for(var i=0;i<clients.length;i++){
      if(reported_user==clients[i].nickname){
        for(var j=0;j<reports.length;j++){
          if(reports[j].to==clients[i].nickname&&reports[j].by==nickname){
            flag=1;
            feedback="you have already reported this user";
          }
        }
        if(flag==0){
          reported+=1;
          reports.push({'to':clients[i].nickname,'by':nickname,'times':reported});
          for(var k=0;k<reports.length;k++){
            if(reports[k].to==reported_user){
              reports[k].times+=1;
            }
          }
        var client_socket=clients[i].ws;
        feedback="You Have Been Reported";
        client_socket.emit('errors',JSON.stringify({'status':reported_user,'message':feedback}));
        feedback="Thank you for reporting."

        socket.emit('selfmessage',JSON.stringify({'nickname':nickname,'message':feedback}));
        feedback="send";
        kick(clients[i].nickname);
      }
      }
    }
  }else{
    feedback="not enough argument"
  }
  if(feedback!="send"){
    socket.emit('errors',JSON.stringify({'status':nickname,'message':feedback}));
  }
}else{
  for(i=0;i<clients.length;i++){
    var client_socket=clients[i].ws;
    if(client_socket!=socket){
      client_socket.emit('chat message',JSON.stringify({'nickname':nickname,"message":msg}));
    }else{
      client_socket.emit('selfmessage',JSON.stringify({'nickname':nickname,"message":msg}));
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


function kick(){
    for(var j=0;j<reports.length;j++){
    console.log(reports[j].times);
      if(reports[j].times==11){
          for(var i=0;i<clients.length;i++){
            if(reports[j].to==clients[i].nickname){
              var name=clients[i].nickname;

        clients[i].ws.disconnect();


        pool.connect(function(err,client,done){
          if(err){
            return console.error('error fetching client from pool',err);
          }
          client.query("DELETE FROM public.users WHERE username='{"+name+"}';",function(err,result){
            done();
            reports.splice(j,1);
            if(err){
              return console.error('error running query',err);
            }
            console.log("kicked");

          });
        });
      }
    }
    }
  }
}
