# Figurkoder.se
This started as a project in the course [2dv607 - RIA-development with JavaScript](https://coursepress.lnu.se/kurs/ria-utveckling-med-javascript/) at [Linnaeus University](https://coursepress.lnu.se/program/webbprogrammerare/)

## Features

- **Offline First**: Works offline using service workers
- **Multiple Training Modes**: Practice numbers, names, letters, dates
- **Customizable Sessions**: Adjust time limits, ranges, and learning modes
- **Results Tracking**: Monitor progress and identify areas for improvement
- **MCP Server**: AI assistant integration via Model Context Protocol

## Offline First
This app is developed to work offline and it should work in [these browsers](http://caniuse.com/#search=service%20workers). Go to settings and then _Add to homepage_ / _Lägg till på startskärmen_ or similar. Now you should be able to launch the app from the shortcut even if you are offline.

## MCP Server Integration

This project includes a Model Context Protocol (MCP) server that allows AI assistants to access and interact with the figurkod data. See [MCP_SERVER.md](MCP_SERVER.md) for detailed documentation.

### Quick MCP Setup
```bash
cd mcp-server
npm install
npm run build
npm start
```


## Installation for developers
After cloning the repository, install dependencies:
```
cd <repo folder>
npm install
```

Now you can run your local server with live preview:
```
npm start
```
Server is located at http://localhost:3000

To build a static version of the project run:
```
npm run build
```

Note that all source code is located under `src/`. When building the project the build ends up in the root. This is a bit ugly and the reason is that both development and hosting is done from the same branch on gh-pages.

## Roadmap

### Todo

 - Add "restart"-buttons to the Result component. Using them the user can either try the same mnemomic image's again or practice them again.
 - Add a setting for turning vibrations on and off.
 - Remove all React-Redux bindings from middle and leaf components and have bindings only in the top level components.
 - Move `src` to a seperate branch.

### Done

 - Make the app offline-first and make the whole app avalible offline. (*UPDATE 2016-03-22:* Using AppCache now instead of SW, must be removed when iOS starts to support SW)
 - When going back from the Result's the settings should be kept.
