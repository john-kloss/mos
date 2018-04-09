const mqtt = require("mqtt");
const moment = require("moment");
const client = mqtt.connect("mqtt://broker.mqtt-dashboard.com");

client.on("connect", () => {
  client.subscribe("weather");
  client.subscribe("/energy/income");
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
});
