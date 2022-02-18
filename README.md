# ElderlyCare 
### For you, for them, a better elderly medical support solution.

The EHH (Elderly Home Healthcare) project was created to fill the gap between residential and health institutes as a middle layer and bring the resource closer to those resource-constrained areas. This is expected to improve response times, let hospital resources be more reachable and most importantly, make no significant changes to elder’s current life. The aim of this project is to focus on helping elderly patients extend their independent existence in their preferred environments meanwhile off-loading the burden from most health institutes.

## General project information
- **Project title**: Elderly Home Healthcare System (EHH System)
- **Student**: Yuanjen Hung
- **Advisor**: Roberto Mastropietro
- **Tutor**: Alessandro Puiatti
- **Semester**: September 2021 - January 2022
- **Master**: Master of Science in Engineering
- **Major**: Computer Science

## How to deploy this system?
First, it will be definitly helpful if you first read the technical report below (Here we explain the architecture of the system, how we implement the system and the respect we consider):
https://docs.google.com/document/d/1pQxPM8ZQ2TOSkoagR6XNTcCAZN8SZjZvNBq3YVQ6v6w/edit?usp=sharing

## Quick start
1. Download the `backend` folder.
2. Open the terminal and make sure you are at `backend` folder, `npm install` all the dependency.
3. `node index.js` start the local server at 3000 port.
4. Be sure you install mongo on your computer and have mongo server running at the background.
   - Mac tutorial: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/
   - Windows tutorial: https://zarkom.net/blogs/how-to-install-mongodb-for-development-in-windows-3328
5. Go to the brower and connect to http://localhost:3000/data
6. You should see the demo web app using our example data.

## What if I want to build one using my own InfluxDB data?
1. In this project, we use one bucket to host all the data we collected from different sensors, we label them with different host name (e.g. arduino_bathroom, arduino_bedroom, arduino_kitchen).
2. In `backend/asset/js`, there're three `.js` files, open all of them and revise the InfluxDB API with your own information (token/bucket/url/org/host).
3. Follow **Quick start** instruction, you should see the demo web app using your own InfluxDB data.

## What if I want to build also the IoT part by myself?
In the `iot` folder, you can find all the template code you might need for Arduino BLE 33 Sense & Raspberry Pi Zero WH! For free to revise them based on your needs, and please remember to configure your Arduino enviroment (select the board, the port and install all the necessary library). 
Same to Raspberry Pi Zero WH, you have to install Raspberry OS, configure Wi-Fi and ssh, install all the necessary modules.

