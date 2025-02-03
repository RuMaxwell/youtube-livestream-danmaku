# YouTube Livestream Danmaku

This is a Chromium based browser extension that displays live chat messages as
danmaku over a YouTube livestream video.

## Features

- [x] Danmaku display
  - [x] Display incoming live chat messages as danmaku over YouTube livestream
    videos
    - [x] Danmaku on default view
    - [x] Danmaku on theater mode
    - [x] Danmaku on fullscreen mode
    - [x] Display emojis
    - [x] Display paid and membership messages
  - [x] Move the live chat area to the bottom of the video
  - [x] Distribute simultaneous chat messages across multiple lines
  - [x] Distribute sequential chat messages that might overlap across multiple
    lines
  - [x] Stop moving when the video is paused and resume when the video is played
- [ ] Interractions
- [ ] Configurations
  - [ ] Configuration panel
  - [ ] Extension configurations
  - [ ] Danmaku
    - [ ] Font
      - [ ] Font family
      - [ ] Font size
    - [ ] Line gap
    - [ ] Color
      - [ ] Text color
      - [ ] Shadow color
      - [ ] Transparency
    - [ ] Speed
    - [x] On/Off
    - [ ] Density (all, no overlap, dense, moderate, sparse)
    - [ ] Display area (upper 1/4, 1/2, full)
  - [ ] Live chat area
    - [ ] Toggle whether to move to the bottom of the video
    - [ ] Maximum waiting time for the live chat area to load

## Installation

This extension is not yet published to the Chrome extension web store. To
install it:

1. Clone this repository
2. Go to the browser's extension page (`chrome://extensions` or other depending
   on your browser).
3. Enable developer mode
4. Click the button with "Load unpacked extension" or something like that
5. From the dialog, choose the folder that contains the extension's source code
6. You should notice the extension has been loaded now. Go to a livestream video
   on YouTube and make sure the live chat replay can be displayed (if not,
   scroll the page to locate it). You may need to click the extension icon once
   to grant permissions to the extension.
7. To update, pull the repository, go to the extension page and click the
   refresh button on the bottom-right of the extension card. Don't forget to
   refresh the video page to make the update work.