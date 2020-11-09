let app = require("express")();
let http = require("http").Server(app);
let io = require("socket.io")(http);
const request = require('request');
let iMetrikResponse;
let iMetrikToken;
let serialNumber;
let vehicleId;
let starterCommand;
let commandId;
let deviceId;
let device;
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
var express = require("express");
app.use(express.json());

io.on("connection", socket => {
  // Log whenever a user connects
  console.log("user connected");

  // Log whenever a client disconnects from our websocket server
  socket.on("disconnect", function() {
    console.log("user disconnected");
  });

  // When we receive a 'message' event from our client, print out
  // the contents of that message and then echo it back to our client
  // using `io.emit()`
  socket.on("message", message => {
    console.log("Message Received: " + message);
    io.emit("message", { type: "new-message", text: 'message from server' });
  });


  socket.on("getiMertrikToken", message => {
    console.log("Message Received: " + message.serialNumber);
    console.log('A');
    //Get iMetrik Token
    request.post('https://webapp.imetrik.com/m2m/rest/accounts/100-4818-00063/login/token?username=securemax&password=max123', {
    }, (error, res, body) => {
      if (error) {
        console.error(error)
        return
      }
      console.log(`1: ${res.statusCode}`);

      iMetrikResponse = JSON.parse(res.body);
      iMetrikToken = iMetrikResponse.payload.token;
      serialNumber = message.serialNumber;
      deviceId = message.deviceId;
      device = message;

      console.log(`Token: ${iMetrikToken}`);

      getVehicleInformation(iMetrikToken, serialNumber);
    });


    // console.log("Message Received: " + message);
    // io.emit("message", { type: "new-message", text: 'message from server' });
  });
});

app.post('/api/postRoute', function(req, res) {
  console.log("post hereeeeee.....");
  // console.log(`Response: ${res.statusCode}`);
  console.log(req);
 //  console.log(res);
  var post_body = req.body;
  res.send(post_body);
});

// Initialize our websocket server on port 5000
http.listen(5000, () => {
  console.log("started on port 5000");
});


function getVehicleInformation(iMetrikToken, serialNumber){
  //console.log(iMetrikToken, 'iMetrikToken', serialNumber);
  console.log('B');
  request.get(`https://webapp.imetrik.com/m2m/rest/accounts/100-4818-00063/vehicles?deviceCriteria.serialNumber=${serialNumber}&token=${iMetrikToken}`, {
    }, (error, res, body) => {
      if (error) {
        console.error(error)
        return
      }
      console.log(`2: ${res.statusCode}`);
      iMetrikResponse = JSON.parse(res.body);
      vehicleId = iMetrikResponse.payload[0].id;

      console.log(`Token: ${iMetrikToken}`);

      console.log(`vehicleId: ${vehicleId}`);
      getCommandId(vehicleId);
  });
}

function getCommandId(vehicleId){
  console.log('C');
  starterCommand = "LOCATE";
  request.get(`https://webapp.imetrik.com/m2m/rest/accounts/100-4818-00063/vehicles/${vehicleId}/communication/send?command=${starterCommand}&token=${iMetrikToken}`, {
    }, (error, res, body) => {
      if (error) {
        console.error(error)
        return
      }
      console.log(`3: ${res.statusCode}`);
      iMetrikResponse = JSON.parse(res.body);
      commandId = iMetrikResponse.payload.commandId;

      console.log(`Token: ${iMetrikToken}`);
      console.log(`vehicleId: ${vehicleId}`);

      sleep(10000).then(() => {

        if (commandId === null){
          getCommandId(vehicleId);
        } else{
          console.log(`commandId: ${commandId}`);
          getVehicleLocation(commandId);
        }
      });
  });
}

function getVehicleLocation(commandId){
  console.log('D');
  request.get(`https://webapp.imetrik.com/m2m/rest/accounts/100-4818-00063/commands/${commandId}?token=${iMetrikToken}`, {
    }, (error, res, body) => {
      if (error) {
        console.error(error)
        return
      }
      console.log(`4: ${res.statusCode}`);
      iMetrikResponse = JSON.parse(res.body);
      //console.log(iMetrikResponse);
      // vehicleLocation = iMetrikResponse.payload.result.geoPosition;
      console.log(`Token: ${iMetrikToken}`);
      console.log(`vehicleId: ${vehicleId}`);
      console.log(`commandId: ${commandId}`);

      if (iMetrikResponse.payload.result === null){
        console.log('Busy: '+ iMetrikResponse.payload.result);
        getVehicleLocation(commandId);
      } else {
        console.log(`Done`);
        io.emit("message", { type: "new-message", imetrik: iMetrikResponse.payload.result, device: device });
      }
  });
}
