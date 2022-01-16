// import latest release from npm repository 
import {InfluxDB, Point} from 'https://unpkg.com/@influxdata/influxdb-client/dist/index.browser.mjs';
      
const url = 'https://eu-central-1-1.aws.cloud2.influxdata.com/'
const token = 'Smrm037Xfq6s4RzcMRkik81q9S6zO8LY8u6mDxPUyOoFmvlrz9C12P63a2eF_xrrrPR8YoIbEBmavRM1yszdaw=='
const org = 'yuanjen.hung@student.supsi.ch'
const bucket = 'HAR_system'

const client = new InfluxDB({ url, token });

const queryApi = client.getQueryApi(org);

function configString(label, color, unit){
    const config = {
        type: 'line',
      
        data: {
            labels: [],
            datasets: [{
                label: label,
                backgroundColor: color,
                borderColor: color,
                data: [],
                pointHitRadius: 50
            }]
        },
      
        options: { 
            scales: {
                x: {
                    grid: {
                        display: false,
                    }
                },
                y: {
                    grid: {
                        display: false,
                    }
                }
            },
            plugins: { 
                tooltip: { 
                callbacks: { 
                    label: function(context) {
                        return context.parsed.y + ` ${unit}`;
                    }
                } 
                },
                legend: {
                    position: 'bottom'
                }
            },
            elements: {
                point:{
                    radius: 0
                }
            }
        }
    };
    return config;
}

function fillUpData(range, measurement, host, aggregateWindow, chart, id, unit){
    const query = `from(bucket: "HAR_system") |> range(start: ${range}) |> filter(fn: (r) => r["_measurement"] == "${measurement}") |> filter(fn: (r) => r["_field"] == "value") |> filter(fn: (r) => r["host"] == "${host}") |> aggregateWindow(every: ${aggregateWindow}, fn: mean, createEmpty: false)`;
    
    var latestData = 0;

    queryApi.queryRows(query, {
        next(row, tableMeta) {
            const o = tableMeta.toObject(row);
            const timeFormat = o._time.slice(o._time.indexOf("T")+1, o._time.indexOf("Z"));
            const timeBuffer = timeFormat.split(":");
            const hour = (+timeBuffer[0] + 1) % 24;
            const minute = timeBuffer[1];
            const second = timeBuffer[2];
            console.log(`${timeFormat}\t${o._measurement}(${o._field}) = ${o._value.toFixed(1)}`);
            addData(chart, `${hour}:${minute}`, o._value.toFixed(1));
            latestData = o._value.toFixed(1);
        },
        error(error) {
            console.error(error);
            console.log('Finished ERROR');
        },
        complete() {
            console.log('Finished SUCCESS');
            console.log(latestData);
            if (id.includes("bulb")) {
                if (latestData > 20) {
                    document.getElementById(id).classList.add("text-warning");
                    document.getElementById(id + "_desc").innerHTML = "Currently inside is bright and shine, maybe someone is using!";
                }
            } else {
                document.getElementById(id).innerHTML = latestData + unit;
            }
        },
    })
}

function addData(chart, label, data) {
    chart.data.labels.push(label);
    chart.data.datasets.forEach((dataset) => {
        dataset.data.push(data);
    });
    chart.update();
}

// Bedroom

const bedTempChart = new Chart(
  document.getElementById('bedTempChart'),
  configString("Temperature at the past 24h", "rgb(255, 99, 132)", "°C")
);

fillUpData("-1d", "temperature", "arduino_bedroom", "30m", bedTempChart, "temp_bedroom", " °C");

const bedHumiChart = new Chart(
    document.getElementById('bedHumiChart'),
    configString("Humidity at the past 24h", "rgb(54, 162, 235)", "%")
);
  
fillUpData("-1d", "humidity", "arduino_bedroom", "30m", bedHumiChart, "humi_bedroom", " %");

const bedLightChart = new Chart(
    document.getElementById('bedLightChart'),
    configString("Luminance at the past 24h", "rgb(255, 205, 86)", "Lux")
);
  
fillUpData("-1d", "light", "arduino_bedroom", "30m", bedLightChart, "bulb_bedroom", " Lux");

// Bathroom

const bathTempChart = new Chart(
    document.getElementById('bathTempChart'),
    configString("Temperature at the past 24h", "rgb(255, 99, 132)", "°C")
  );
  
  fillUpData("-1d", "temperature", "arduino_bathroom", "30m", bathTempChart, "temp_bathroom", " °C");
  
  const bathHumiChart = new Chart(
      document.getElementById('bathHumiChart'),
      configString("Humidity at the past 24h", "rgb(54, 162, 235)", "%")
  );
    
  fillUpData("-1d", "humidity", "arduino_bathroom", "30m", bathHumiChart, "humi_bathroom", " %");
  
  const bathLightChart = new Chart(
      document.getElementById('bathLightChart'),
      configString("Luminance at the past 24h", "rgb(255, 205, 86)", "Lux")
  );
    
  fillUpData("-1d", "light", "arduino_bathroom", "30m", bathLightChart, "bulb_bathroom", " Lux");

  // Kitchen

const kitTempChart = new Chart(
    document.getElementById('kitTempChart'),
    configString("Temperature at the past 24h", "rgb(255, 99, 132)", "°C")
  );
  
  fillUpData("-1d", "temperature", "arduino_kitchen", "30m", kitTempChart, "temp_kitchen", " °C");
  
  const kitHumiChart = new Chart(
      document.getElementById('kitHumiChart'),
      configString("Humidity at the past 24h", "rgb(54, 162, 235)", "%")
  );
    
  fillUpData("-1d", "humidity", "arduino_kitchen", "30m", kitHumiChart, "humi_kitchen", " %");
  
  const kitLightChart = new Chart(
      document.getElementById('kitLightChart'),
      configString("Luminance at the past 24h", "rgb(255, 205, 86)", "Lux")
  );
    
  fillUpData("-1d", "light", "arduino_kitchen", "30m", kitLightChart, "bulb_kitchen", " Lux");