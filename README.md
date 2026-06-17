#Adrien Bertrand & Sam Kosal

#Setup instructions
1. Install both Salamander_Project and Centroid-Finder
2. Run Npm install i in the Salamander_Project main directory
3. Run cd processor in centroid-finder
4. Run mvn compile
5. Open new command window in centroid-finder and run cd server
6. Run npm install i
7. Create two new folders in Centroid-finder main directory: Log and Videos
8. Copy any videos you would like to analyze in Videos
9. Create a .env file in Centroid-Finder/Server. Copy the following into it:

'''VIDEOS_PATH=../videos
OUTPUT_PATH=../output
LOG_PATH=../log
PORT=3000
JAR_PATH=../../processor/target/videoprocessor.jar'''

10. Return to the command window that was cd'd into server and run npm run dev
11. Run npm run dev in Salamander_Project. Note that both of these need to be running simultaneously, you will need two windows.
12. Follow the URL provided by Salamander_Project. You should be up and running.

#Color Palette
This project uses Pure Black, Green-600, Red-600, and Orange-600 via tailwind

#Unique Features

##Job Log
Through the log page users can view previous jobs and information about them.

##Live Videos
The user can view the video they will be processing in the client, as well as the binarized version that will be analyzed. This can be viewed from the video preview pages