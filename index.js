var app=require('express')();
var http=require('http').Server(app);
var io = require('socket.io')(http);
var uuid=require('uuid');
var clients=[];
app.get('/',function(req,res){
  res.sendFile(__dirname+'/index.html');
});


io.on('connection',function(socket){
  console.log("client connected");
var client_uuid=uuid.v4();
var nickname=client_uuid.substr(0,8);
clients.push({"id":client_uuid,"ws":socket,"nickname":nickname});
io.emit('chat message',nickname+" is connected");
updateuser();
socket.on('chat message',function(msg){
  for(i=0;i<clients.length;i++){
    var client_socket=clients[i].ws;
    if(client_socket!=socket){
      client_socket.emit('chat message',nickname+">"+msg);
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
