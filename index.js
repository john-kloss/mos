"use strict";
const mqtt = require("mqtt");
const moment = require("moment");
const request = require("request");
const client = mqtt.connect("mqtt://broker.mqtt-dashboard.com");
var sys = require("sys");
var exec = require("child_process").exec;
//var sleep = require('sleep'); 


let ready = {
  dishwasher: false,
  washingmachine: false
};

let apiKey = "bd5e378503939ddaee76f12ad7a97608";
let city_id = "2874545"; //Magdeburg
let url = `http://api.openweathermap.org/data/2.5/forecast?id=${city_id}&appid=${apiKey}`;

var futureWeather;
request(url, function(err, response, body) {
  if (err) {
    console.log("error:", error);
  } else {
    let weather = JSON.parse(body);
    futureWeather = weather.list[1].weather[0].main;
  }
});

client.on("connect", () => {
  client.subscribe("weather");
  client.subscribe("/energy/income");
  client.subscribe("/device/status");
  client.subscribe("/device/dishwasher/ready");
  client.subscribe("/device/washingmachine/ready");
  client.subscribe("/central/prediction");
});

/**
 * WEATHER
 */

client.on("message", (topic, message) => {
  /** 
  if (topic === "weather") {
    const data = JSON.parse(message);
    let tendencyWindSpeed;
    if (data[0].wind.speed > data[1].wind.speed) {
      tendencyWindSpeed = "decreasing";
    } else {
      tendencyWindSpeed = "increasing";
    }
    let tendencyWeather="EMPTY";
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
    console.log(weather.tendencyWeather.toString());
    client.publish("/central/prediction", tendencyWeather);
  }
*/
  /**
   * /ENERGY/INCOME
   */
  let currentWeather;
  if (topic === "/energy/income") {
    const energy = JSON.parse(message);
    const hour = moment().format("HH");

    if (energy < 5000) {
      currentWeather = "dark";
      console.log("dark");
      client.publish("/device/status", "0");

      // if the weather is still bad we start anyways
      // if (hour > 14) {
      //   client.publish("/device/status", "1");
      //   console.log("starting");
      // }
    } else if (energy < 9000) {
      currentWeather = "overcast";
      client.publish("/device/status", "1");
      console.log("overcast");
    } else {
      currentWeather = "sunny";
      console.log("sunny");
      client.publish("/device/status", "2");
    }

    let tendencyWeather;
    if (currentWeather === futureWeather) {
      tendencyWeather = "constant";
    } else if (currentWeather === "Clear") {
      tendencyWeather = "less sun";
    } else if (futureWeather === "Clear") {
      tendencyWeather = "more sun";
    } else {
      tendencyWeather = "constant";
    }
    console.log("Tendency: " + tendencyWeather + " in the next 3 hours");
    client.publish(
      "/central/prediction",
      tendencyWeather.toString() + " in the next 3 hours"
    );
  }

  /**
   * /DEVICE/STATUS
   */
  if (topic === "/device/dishwasher/ready") {
    const state = JSON.parse(message);
    if (state == "1") {
      ready.dishwasher = true;
    }
  }

  if (topic === "/device/washingmachine/ready") {
    const state = JSON.parse(message);
    if (state == "1") {
      ready.washingmachine = true;
    }
  }

  if (topic === "/device/status") {
    const status = JSON.parse(message);
    console.log(status);
    if (
      status === 2 &&
      ready.dishwasher === true &&
      ready.washingmachine === true
    ) {
      var child;
      child = exec(
        "sshpass -p 'ZH3d3IpK' ssh pi@192.168.23.120 'python dishwasher.py & python washingmachine.py'",
        function(error, stdout, stderr) {
          if (error !== null) {
            console.log("exec error: " + error);
          }
          //client.publish("/device/status", "2");
          client.publish("/device/dishwasher/status", "1");
          client.publish("/device/washingmachine/status", "1");
          //sleep.sleep(5);
          console.log("Dishwasher and Washingmachine done");
          client.publish("/device/dishwasher/feedback", "0");
          client.publish("/device/washingmachine/feedback", "0");
          client.publish("/device/washingmachine/status", "0");
          client.publish("/device/dishwasher/status", "0");
          ready.washingmachine = false;
          ready.dishwasher = false;
        }
      );
    } else if (status === 1) {
      if(ready.dishwasher === true){
        var child;
        child = exec(
        "sshpass -p 'ZH3d3IpK' ssh pi@192.168.23.120 'python dishwasher.py'",
        function(error, stdout, stderr) {
          if (error !== null) {
            console.log("exec error: " + error);
          }
          //client.publish("/device/status", "1");
          client.publish("/device/dishwasher/status", "1");
          //sleep.sleep(5);
          ready.dishwasher = false;
          console.log("Dishwasher done");
          client.publish("/device/dishwasher/feedback", "0");
          client.publish("/device/dishwasher/status", "0");
          //done.dishwasher = true;
        }
      );
      }
      else if (ready.washingmachine === true){
      var child;
      child = exec(
      "sshpass -p 'ZH3d3IpK' ssh pi@192.168.23.120 'python washingmachine.py'",
      function(error, stdout, stderr) {
        if (error !== null) {
          console.log("exec error: " + error);
        }
        //client.publish("/device/status", "3");
        client.publish("/device/washingmachine/status", "1");
        //sleep.sleep(5);
        ready.washingmachine = false;
        console.log("Washingmachine done");
        client.publish("/device/washingmachine/feedback", "0");
        client.publish("/device/washingmachine/status", "0");
      }
    );
    }
      
    }
  }

});
