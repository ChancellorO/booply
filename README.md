# Booply

A smart time-management app that helps plans happen on-time!

## Problem

Managing time is hard. Whether you're heading out alone or meeting friends, people often underestimate how long things take or lose track of when you should actually leave. Booply helps you turn plans into action by telling you exactly when to go and keeping you accountable in a lightweight, friendly way.

## Features

- **Smart Alarm Scheduling**: Automatically calculates when to leave for any event based on location and travel time
- **Solo & Group Plans**: Create personal plans or group hangs with friends
- **Real-time Progress Pings**: Get live updates on group members' location and status
- **Leave Verification**: Automatic location check ensures you actually left on time
- **Leaderboard & Ranks**: Light gamification around punctuality to encourage accountability
- **Profile & Stats**: Track your on-time rate, trends, and performance over time

## How It Works

1. **Plan Creation**: Create a hang with a location and time
2. **Smart Calculations**: Booply analyzes travel time and weather to determine exactly when you need to leave
3. **Alarm & Notification**: Get a notification at the calculated departure time
4. **Location Verification**: Confirm you've left by checking your location
5. **Real-time Updates**: Share live updates with your group as you head out
6. **Stats & Leaderboard**: Track your punctuality and compete with friends

## Tech Stack

### Frontend
- **React Native** with **Expo** - Cross-platform mobile development
- **TypeScript** - Type safety
- **Expo Router** - Navigation and routing
- **NativeWind** - Tailwind CSS for React Native
- **React Navigation** - Tab-based and stack navigation

### Backend & Database
- **Supabase** - PostgreSQL database and authentication
- **Expo Notifications** - Push notification services

### Key Libraries
- **Mapbox** - Location and mapping services
- **Expo Location** - Native location tracking
- **Expo Sensors** - Device sensor access
- **Expo Image Picker** - Photo selection
- **AsyncStorage** - Local data persistence
