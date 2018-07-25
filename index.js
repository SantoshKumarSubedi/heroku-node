var app=require('express')();
var http=require('http').Server(app);
var io = require('socket.io')(http);

app.get('/',function(req,res){
  res.sendFile(__dirname+'/index.html');
});

http.listen(process.env.PORT||8080,function(){
  console.log('listening on *:3000');
});
