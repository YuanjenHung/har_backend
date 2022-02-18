#include "SAMDTimerInterrupt.h"
#include "SAMD_ISR_Timer.h"
#include <ArduinoBLE.h>
#include <time.h>

#define HW_TIMER_INTERVAL_MS 10
#define TIMER_INTERVAL_S 60

uint32_t light;
unsigned char humidity[4], temperature[4];

int count = 0;

SAMDTimer ITimer(TIMER_TC3);
SAMD_ISR_Timer ISR_Timer; 
bool volatile is_interrupt_1_enabled = false;

const char* hoppingServiceUuid = "3291138a-409d-11ec-973a-0242ac130003";
const char* hoppingAmbientCharacteristicUuid = "329115ce-409d-11ec-973a-0242ac130003";
const char* hoppingHumidityCharacteristicUuid = "329116b4-409d-11ec-973a-0242ac130003";
const char* hoppingTemperatureCharacteristicUuid = "3291177c-409d-11ec-973a-0242ac130003";

const char* deviceServiceUuid = "56f0165a-46f5-11ec-81d3-0242ac130003";
const char* ambientLightCharacteristicUuid = "56f01880-46f5-11ec-81d3-0242ac130003";
const char* humidityCharacteristicUuid = "56f01966-46f5-11ec-81d3-0242ac130003";
const char* temperatureCharacteristicUuid = "50ad77e2-46f5-11ec-81d3-0242ac130003";

void enable_interrupt_1(){
    is_interrupt_1_enabled = true;
}

void TimerHandler(void){
    ISR_Timer.run();
}

/*
56f0165a-46f5-11ec-81d3-0242ac130003
56f01880-46f5-11ec-81d3-0242ac130003
56f01966-46f5-11ec-81d3-0242ac130003
56f01a38-46f5-11ec-81d3-0242ac130003
56f01e98-46f5-11ec-81d3-0242ac130003
56f01f74-46f5-11ec-81d3-0242ac130003
56f02028-46f5-11ec-81d3-0242ac130003
56f020e6-46f5-11ec-81d3-0242ac130003
*/

// Create BLEService
BLEService sensorsService(deviceServiceUuid); 

// Create some characteristics to be added to the sensorsService
BLEIntCharacteristic ambientLightCharacteristic(ambientLightCharacteristicUuid, BLERead | BLENotify);
BLEFloatCharacteristic humidityCharacteristic(humidityCharacteristicUuid, BLERead | BLENotify);
BLEFloatCharacteristic temperatureCharacteristic(temperatureCharacteristicUuid, BLERead | BLENotify);

float parse_float(unsigned char b[]){
    float f;
    unsigned char buffer[] = {b[0], b[1], b[2], b[3]};
    memcpy(&f, &buffer, sizeof(f));
    return f;
}

void setup() {
    pinMode(LED_BUILTIN, OUTPUT);

    // begin initialization
    if (!BLE.begin()) {
        while (1);
    }

    ITimer.attachInterruptInterval(HW_TIMER_INTERVAL_MS * 1000, TimerHandler);
    ISR_Timer.setInterval(TIMER_INTERVAL_S * 1000, enable_interrupt_1);

    // Serial.println("BLE Central scan");

    // Set device name, local name and advertised service
    BLE.setLocalName("Hopping Bathroom");
    BLE.setDeviceName("Hopping Bathroom");
    BLE.setAdvertisedService(sensorsService);

    // Add all the characteristic to the service
    sensorsService.addCharacteristic(ambientLightCharacteristic); 
    sensorsService.addCharacteristic(humidityCharacteristic); 
    sensorsService.addCharacteristic(temperatureCharacteristic);

    // Add the services to the device
    BLE.addService(sensorsService);
    
    // start scanning for peripheral
    BLE.scanForUuid(hoppingServiceUuid);
}

void loop() {
    checkPeripheral();   
}

void checkPeripheral() {
    BLE.stopAdvertise();
    BLE.scanForUuid(hoppingServiceUuid);
    
    delay(1000);

    BLEDevice peripheral = BLE.available();
    if (peripheral) {
        BLE.stopScan();
        connectToPeripheral(peripheral);
    }
}

void connectToPeripheral(BLEDevice peripheral) {
    if (!peripheral.connect()) return;
    subscribeToPeripheral(peripheral);
}

void subscribeToPeripheral(BLEDevice peripheral) {
    if (!peripheral.discoverAttributes()) return;

    BLECharacteristic hoppingAmbientCharacteristic = peripheral.characteristic(hoppingAmbientCharacteristicUuid);
    BLECharacteristic hoppingHumidityCharacteristic = peripheral.characteristic(hoppingHumidityCharacteristicUuid);
    BLECharacteristic hoppingTemperatureCharacteristic = peripheral.characteristic(hoppingTemperatureCharacteristicUuid);
        
    if (!hoppingAmbientCharacteristic || !hoppingHumidityCharacteristic || !hoppingTemperatureCharacteristic) {
        peripheral.disconnect();
        return;
    } 

    BLE.advertise();
    
    while (peripheral.connected()) {
        if (is_interrupt_1_enabled){
            hoppingAmbientCharacteristic.readValue(light);
            ambientLightCharacteristic.writeValue(light);

            hoppingHumidityCharacteristic.readValue(humidity, 4);
            humidityCharacteristic.writeValue(parse_float(humidity));

            hoppingTemperatureCharacteristic.readValue(temperature, 4);
            temperatureCharacteristic.writeValue(parse_float(temperature));

            is_interrupt_1_enabled = false;
        }
        
        if (!BLE.central() && digitalRead(LED_BUILTIN)) {
            digitalWrite(LED_BUILTIN, LOW);
            BLE.advertise();
        } else if (BLE.central() && !digitalRead(LED_BUILTIN)) {
            digitalWrite(LED_BUILTIN, HIGH);
        }
    }
    return;
}