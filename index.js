"use strict";
const mqtt = require("mqtt");
const moment = require("moment");
const client = mqtt.connect("mqtt://broker.mqtt-dashboard.com");
var sys = require("sys");
var exec = require("child_process").exec;


let ready = { 
  dishwasher: false,
  washingmachine: false
} 

client.on("connect", () => {
  client.subscribe("weather");
  client.subscribe("/energy/income");
  client.subscribe("/device/status");
  client.subscribe("/device/dishwasher/ready")
  client.subscribe("/device/washingmachine/ready")
});

/**
 * WEATHER
 */

client.on("message", (topic, message) => {
  if (topic === "weather") {
    const data = JSON.parse(message);
    let tendencyWindSpeed;
    if (data[0].wind.speed > data[1].wind.speed) {
      tendencyWindSpeed = "decreasing";
    } else {
      tendencyWindSpeed = "increasing";
    }
    let tendencyWeather;
    const currentWeather = data[0].weather[0].main;
    const futureWeather = data[1].weather[0].main;
    if (currentWeather === futureWeather) {
      tendencyWeather = "constant";
    } else if (currentWeather === "Clear") {
      tendencyWeather = "less sun";
    } else if (futureWeather === "Clear") {
      tendencyWeather = "more sun";
    } else {
      tendencyWeather = "constant";
    }

    const weather = {
      tendencyWindSpeed,
      tendencyWeather
    };
    client.publish("/central/prediction", weather.toString());
  }

  /**
   * /ENERGY/INCOME
   */
  if (topic === "/energy/income") {
    const energy = JSON.parse(message);
    const hour = moment().format("HH");

    if (energy < 5000) {
      console.log("dark");
      client.publish("/device/status", "0");

      // if the weather is still bad we start anyways
      // if (hour > 14) {
      //   client.publish("/device/status", "1");
      //   console.log("starting");
      // }
    } else if (energy < 9000) {
      client.publish("/device/status", "1");
      console.log("overcast");
    } else {
      console.log("sunny");
      client.publish("/device/status", "2");
    }
  }
   
  /**
   * /DEVICE/STATUS
   */
  if (topic=== "/device/dishwasher/ready"){
    const state= JSON.parse(message);
    if (state=="1"){
      ready.dishwasher=true;
    }
    
  }

  if (topic=== "/device/washingmachine/ready"){
    const state= JSON.parse(message);
    if (state=="1"){
      ready.washingmachine=true;
    }
    
  }


  if (topic === "/device/status" && ready.dishwasher===true){
    const status = JSON.parse(message);
    console.log(status);
    if (status===2){
      var child;
      child = exec("sshpass -p 'ZH3d3IpK' ssh pi@192.168.23.120 'python dishwasher.py & python washingmachine.py'", function(error, stdout, stderr) {
      if (error !== null) {
        console.log("exec error: " + error);
      }
      console.log("Dishwasher and Washingmachine done");
      client.publish("/device/dishwasher/feedback", "0");
      client.publish("/device/washingmachine/feedback", "0");
      ready.washingmachine=false;
      ready.dishwasher=false;

    
    });
    }
    else if (status===1){
      var child;
      child = exec("sshpass -p 'ZH3d3IpK' ssh pi@192.168.23.120 'python dishwasher.py'", function(error, stdout, stderr) {
      if (error !== null) {
        console.log("exec error: " + error);
      }
      console.log("Dishwasher done");
      client.publish("/device/dishwasher/feedback", "0");
      ready.dishwasher=false;
      
    });
       
  }
}

  

});
