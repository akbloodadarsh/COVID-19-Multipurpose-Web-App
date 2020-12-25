const path = require('path');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const api = require('novelcovid');
const request = require('request');
const app = express();  

const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');
const server = http.createServer(app);
const io = socketio(server);


app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended : true}));
app.use(express.static("public"));

app.get("/", function(req, res){
    api.countries({sort:'cases'}).then(function(result){
        res.render("index", {datas : result});
    }).catch(function(err){
        console.log(err);
    });
});

app.get("/news", function(req, res){
        request('https://covid-19india-api.herokuapp.com/headlines', function (error, response, body) {
          var content = JSON.parse(body);
          res.render("news",{datas : content});
    });
});

app.get("/screening", function(req, res){
  res.render("screening");
});

app.get("/questions", function(req, res){
  res.render("questions");
});

app.get("/map", function(req, res){
  api.countries().then(function(result){
        var arr = [];
        result.forEach(function(data){
          var obj = {
          lat: data.countryInfo.lat,
          long: data.countryInfo.long,
          cases: data.cases
        }
          arr.push(obj);
        });
        res.render("worldmap", {datas : arr});
        console.log(arr);
        fs.writeFile("/temp", arr, function(err){
          if(err){
              console.log(err);
          } else{
              console.log("success");
          }
        });
    }).catch(function(err){
        console.log(err);
    });
});

app.get("/screening", function(req, res){
    res.render("screening");
});

app.get("/chat", function(req, res){
    res.render("chat");
});

app.get("/chatroom", function(req, res){
    res.render("chatroom");
});

const botName = 'ChatCord Bot';

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to Covid-19 Helpline Chat Room!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
