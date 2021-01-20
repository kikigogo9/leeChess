







//const { Status } = require("./statuses.js");

//let clickSound = new Audio("../data/click.wav");

/* constructor of game state */
function GameState(sb, socket) {
    this.board = Chess();
    this.playerType = null;
    this.statusBar = sb;
    this.move_first = null;
    this.move_second = null;
    this.turn = false;
  
    this.getPlayerType = function () {
      return this.playerType;
    };
  
    this.setPlayerType = function (p) {
      this.playerType = p;
    };
  
    this.whoWon = function () {
      //too many wrong guesses? Player A (who set the word) won
      if (this.board.in_checkmate()) {
        if (this.playerType == "WHITE") {
          return "BLACK";
        }
        else {
          return "WHITE";
        }
        
      }
      //word solved? Player B won
      return null; //nobody won yet
    };
  
    this.updateGame = function (move_start, move_end) {
  
      let moved = this.board.move({from: move_start, to: move_end});
      console.log(moved);
      let res = false;

    
      if (moved !== null) {
        this.turn = !this.turn;
        updateBoard(move_start, move_end);
        res = true;
      }
      
  
      //var outgoingMsg = Messages.O_MAKE_MOVE;
      //outgoingMsg.data = {move_start, move_end};
      //socket.send(JSON.stringify(outgoingMsg));
  
      //is the game complete?
      let winner = this.whoWon();
      
  
      //POSSIBLY CHANGE THIS AS WELL TO PROPERLY DISABLE THE GAME
      if (winner != null) {
        console.log(winner);
        /* disable further clicks by cloning each alphabet
         * letter and not adding an event listener; then
         * replace the original node through some DOM logic
         */
        let elements = document.querySelectorAll(".letter");
        Array.from(elements).forEach(function (el) {
         // el.style.pointerEvents = "none";
        });
  
       /* let alertString;
        if (winner == this.playerType) {
          alertString = Status["gameWon"];
        } else {
          alertString = Status["gameLost"];
        }
        alertString += Status["playAgain"]; */
       // sb.setStatus(alertString);
        if (this.playerType == winner) {
          createEndScreen("Congratulations - You Won!!");
        } else {
          createEndScreen("Game Over - better luck next time");
        }
  
        let finalMsg = Messages.O_GAME_WON_BY;
        finalMsg.data = this.getPlayerType;
        //socket.close();
      }

      return res;
    };
  
    this.sendMove = function(move_first, move_second) {
      //first, update the game for the current player
      if (!this.updateGame(move_first, move_second)) {
        console.log("Invalid move - please try again");
      }
  
      //then, send the move to the other player across the server
      var outgoingMsg = Messages.O_MAKE_MOVE;
      outgoingMsg.data = {move_first, move_second};
      socket.send(JSON.stringify(outgoingMsg));
    }
  }
  
  //CHANGE THIS TO CREATE AN INTERACTIVE CHESSBOARD
  function ChessBoard(gs) {
    //only initialize for player that should actually be able to use the board
    this.initialize = function () {
      initBoard(gs.playerType);
      var elements = document.querySelectorAll(".tile");
      Array.from(elements).forEach(function (el) {
        el.addEventListener("click", function singleClick(e) {
            //socket.send(e.target.id);
           
            console.log(e.target.id);
          if (gs.turn === false) {
              
            return;
          }
          if (gs.move_first == null) {
            gs.move_first = e.target.id;
          }
          else if (gs.move_second == null) {
             
            gs.move_second = e.target.id;
            gs.sendMove(gs.move_first, gs.move_second);
            gs.move_first = null;
            gs.move_second = null;
            
          } else {
            gs.move_first = e.target.id;
            gs.move_second = null;
          }
        });
      });
    };
  }
  
  
  //CHANGE THIS TO SET EVERYTHING UP ACCORDINGLY
  //set everything up, including the WebSocket
  (function setup() {
    var socket = new WebSocket(Setup.WEB_SOCKET_URL);
  
    /*
     * initialize all UI elements of the game:
     * - visible word board (i.e. place where the hidden/unhidden word is shown)
     * - status bar
     * - alphabet board
     *
     * the GameState object coordinates everything
     */
    var sb = new StatusBar();
  
    var gs = new GameState(sb, socket);
    var cb ;
    
  
    socket.onmessage = function (event) {
      let incomingMsg = JSON.parse(event.data);
      console.log(incomingMsg);
  
      //set player type
      if (incomingMsg.type == Messages.T_PLAYER_TYPE) {
        gs.setPlayerType(incomingMsg.data); //should be "WHITE" or "BLACK"
        
        cb = new ChessBoard(gs);
        cb.initialize();
        if (gs.playerType === "WHITE") {
          gs.turn = true;
          
        }
        //if player type is A, (1) pick a word, and (2) sent it to the server
      }
  
      //Player B: wait for target word and then start guessing ...
      if (
        incomingMsg.type == Messages.T_MAKE_MOVE
      ) {
        console.log(incomingMsg.data);

        if (!gs.updateGame(incomingMsg.data.move_first, incomingMsg.data.move_second)) {
          console.log("Invalid move from opponent");
        }
        
  
        //sb.setStatus(Status["player2Intro"]);
        //gs.initializeVisibleWordArray(); // initialize the word array, now that we have the word
        //vw.setWord(gs.getVisibleWordArray());
      }
    };
  
    socket.onopen = function () {
      socket.send("{}");
    };
  
    //server sends a close event only if the game was aborted from some side
    socket.onclose = function () {
      if (gs.whoWon() == null) {
        //sb.setStatus(Status["aborted"]);
      }
    };
  
    socket.onerror = function () { };
  })(); //execute immediately