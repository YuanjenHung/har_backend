import pygatt
import struct
from time import sleep
from datetime import datetime
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

# You can generate an API token from the "API Tokens Tab" in the UI
token = "Smrm037Xfq6s4RzcMRkik81q9S6zO8LY8u6mDxPUyOoFmvlrz9C12P63a2eF_xrrrPR8YoIbEBmavRM1yszdaw=="
org = "yuanjen.hung@student.supsi.ch"
bucket = "HAR_system"
client = InfluxDBClient(url="https://eu-central-1-1.aws.cloud2.influxdata.com", token=token, org=org)

BEDROOM_MAIN_ADDRESS = 'B5:D3:43:D9:DF:69'
bedroom_ambientLight_Uuid = "19b10001-e8f2-537e-4f6c-d104768a1214"
bedroom_humidity_Uuid = "19b10002-e8f2-537e-4f6c-d104768a1214"
bedroom_temperature_Uuid = "19b10003-e8f2-537e-4f6c-d104768a1214"
BATHROOM_MAIN_ADDRESS = '24:62:AB:B9:A4:26'
bathroom_ambientLight_Uuid = "56f01880-46f5-11ec-81d3-0242ac130003"
bathroom_humidity_Uuid = "56f01966-46f5-11ec-81d3-0242ac130003"
bathroom_temperature_Uuid = "56f01966-46f5-11ec-81d3-0242ac130003"
KITCHEN_MAIN_ADDRESS = '72:3A:38:EB:BA:24'
kitchen_ambientLight_Uuid = "710c9c10-4561-11ec-81d3-0242ac130003"
kitchen_humidity_Uuid = "710c9d46-4561-11ec-81d3-0242ac130003"
kitchen_temperature_Uuid = "710c9e22-4561-11ec-81d3-0242ac130003"
# kitchen_force_Uuid = "710c9ee0-4561-11ec-81d3-0242ac130003"

LIGHT_HANDLE = "0x000c"
HUMIDITY_HANDLE = "0x000f"
TEMPERATURE_HANDLE = "0x0012"
# FORCE_HANDLE = "0x0015"

def parse_float(raw_value):
  tuples = struct.unpack('<f', bytes(raw_value))
  return tuples[0] if len(tuples) else None

def parse_int(raw_value):
  tuples = struct.unpack('<i', bytes(raw_value))
  return tuples[0] if len(tuples) else None

def connect(address, string):
  adapter = pygatt.GATTToolBackend()
  adapter.start()
  write_api = client.write_api(write_options=SYNCHRONOUS)
  try: 
    sensor = adapter.connect(address)

    light = parse_int(sensor.char_read_handle(LIGHT_HANDLE))
    data = data_formator("light", string, light)
    write_api.write(bucket, org, data)
    print(f"Ambient ({string}):\t{light}")

    humidity = round(parse_float(sensor.char_read_handle(HUMIDITY_HANDLE)), 2)
    if humidity != 0:
      data = data_formator("humidity", string, humidity)
      write_api.write(bucket, org, data)
      print(f"Humidity ({string}):\t{humidity} %")

    temperature = round(parse_float(sensor.char_read_handle(TEMPERATURE_HANDLE)), 2)
    if temperature != 0:
      data = data_formator("temperature", string, temperature)
      write_api.write(bucket, org, data)
      print(f"Temperature ({string}):\t{temperature} °C")
  
  except:
    print(" -> Oops, something went wrong :p")
    
  finally:
    adapter.stop()

def data_formator(measurement, host, value):
  return f"{measurement},host=arduino_{host} value={value}"
  

if __name__ == "__main__":
  adapter = pygatt.GATTToolBackend()
  adapter.start()

  while(1):
    connect(KITCHEN_MAIN_ADDRESS, "kitchen")
    connect(BATHROOM_MAIN_ADDRESS, "bathroom")
    connect(BEDROOM_MAIN_ADDRESS, "bedroom")
    print(" ----------sleep for 60s-----------")
    sleep(60)
    

  
  