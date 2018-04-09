"use strict";
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://broker.mqtt-dashboard.com");

client.on("connect", () => {
  client.subscribe("weather");
  client.subscribe("/energy/income");
  //client.publish("/central/prediction", "true");
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
    if (energy < 7000) {
      console.log("cloudy");
    } else {
      client.publish("/device/status", 1);
      console.log("sunny");
    }
  }


});
var sys = require("sys");
var exec = require("child_process").exec;
var child;
child = exec("sshpass -p 'ZH3d3IpK' ssh pi@192.168.23.120 'python led.py'", function(error, stdout, stderr) {
  console.log("stdout: " + stdout);
  console.log("stderr: " + stderr);
  if (error !== null) {
    console.log("exec error: " + error);
  }
});