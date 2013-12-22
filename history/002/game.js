var RECT_LENGTH = 24;
var DEFAULT_STYLE = "#4C8DAE";
var DEFAULT_BORDER = "#FFF";
var NORMAL_SPEED = 400;
var FAST_SPEED = 50;

var WIDTH = 360;
var HEIGHT = 552;
var NEXT_WIDTH = 96;
var NEXT_HEIGHT = 96;

// Rectangle class, for drawing rectangles
var RectItem = function(context, config) {

    var _rectLength = config && config.rectLength || RECT_LENGTH;

    var _context = context;

    if ( !_context ) {
        return ;
    }

    var _halfLength = _rectLength / 2;

    // get the left top corner by center point
    var _getLeftTop = function(center) {
        return [ center-_halfLength, center-_halfLength ];
    };

    // draw the rectangle
    var _drawRectangleByLeftTop = function(leftTop, style, border) {
        if ( leftTop.length && leftTop.length == 2 ) {
            if ( style ) {
                _context.fillStyle = style;
            }
            else {
                _context.fillStyle = DEFAULT_STYLE;
            }
            if ( border ) {
                _context.fillStyle = border;
            }
            else {
                _context.strokeStyle = DEFAULT_BORDER;
            }
            _context.fillRect(leftTop[0], leftTop[1], _rectLength, _rectLength);
            _context.strokeRect(leftTop[0], leftTop[1], _rectLength, _rectLength);
        }
    };

    // draw rectangles by matrix
    var _refreshCanvas = function(rectItems, styles, offset) {
        offset = offset || 0;
        _clear();
        if ( !rectItems || !rectItems.length ) {
            return ;
        }
        var currentTopLeft = [0, offset * _rectLength];
        for ( var i = 0; i < rectItems.length; i++ ) {
            if ( !rectItems[i].length ) {
                return ;
            }
            for ( var j = 0; j < rectItems[i].length; j++ ) {
                if ( rectItems[i][j] ) {
                    if ( styles ) {
                        _drawRectangleByLeftTop(currentTopLeft, styles[i][j]);
                    }
                    else {
                        _drawRectangleByLeftTop(currentTopLeft);
                    }
                }
                currentTopLeft[0] += _rectLength;
            }
            currentTopLeft[0] = 0;
            currentTopLeft[1] += _rectLength;
        }
    };

    var _clear = function() {
        context.clearRect(0, 0, WIDTH, HEIGHT);
    };

    this.refreshCanvas = _refreshCanvas;
};

// Teris items
var TerisItem = function(config) {
    var _rectLength = config && config.rectLength || RECT_LENGTH;
    
    var _iItem = [
        [1, 1, 1, 1]
    ];

    var _jItem = [
        [1, 0, 0],
        [1, 1, 1]
    ];

    var _lItem = [
        [0, 0, 1],
        [1, 1, 1]
    ];

    var _oItem = [
        [1, 1],
        [1, 1]
    ];

    var _sItem = [
        [0, 1, 1],
        [1, 1, 0]
    ];

    var _tItem = [
        [0, 1, 0],
        [1, 1, 1]
    ];

    var _zItem = [
        [1, 1, 0],
        [0, 1, 1]
    ];

    var _items = [ _iItem, _jItem, _lItem, _oItem, _sItem, _tItem, _zItem ];

    // generate random items
    var _getRandomItem = function(topLeft) {
        var selected = Math.floor(Math.random() * 7);
        var item = _items[selected];
        
        return item;
    };

    this.getRandomItem = _getRandomItem;
};

// Main game class
var Game = function(gameContext, nextContext, config) {
    if ( !gameContext || !nextContext ) {
        return;
    }
    var _items = [];        // the whole stage
    var _nextItems = [];
    var _styles = [];       // not used now
    var _rectLength = config && config.rectLength || RECT_LENGTH;
    var _terisItem = new TerisItem(config);
    var _mainStage = new RectItem(gameContext, config);
    var _nextStage = new RectItem(nextContext, config);
    var _mainLoop;          // main loop obj
    var _score = 0;         // score
    var _isFast = false;    // is in fast fall down now
    var _updateScoreCallback;
    var _gameOverCallback;

    var _currentItem = {};  // current teris item
    var _nextItem = {};
    var _lines = HEIGHT / _rectLength + 1;      // lines
    var _nextLines = NEXT_HEIGHT / _rectLength;
    var _nextRows = NEXT_WIDTH / _rectLength;
    var _rows = WIDTH / _rectLength;            // rows
    var _centerLeft = parseInt(_rows / 2) - 1; // center of the top, the new items will appear here

    var _init = function() {
        _items = [];
        _nextItems = [];
        _sytles = [];
        _currentItem = {};
        _nextItem = {};
        // initialize the main stage
        for ( var i = 0; i < _lines; i++ ) {
            _items.push([]);
            _styles.push([]);
            for ( var j = 0; j < _rows; j++ ) {
                _items[i].push(0);
                _styles[i].push(0);
            }
        }

        for ( var i = 0; i < _nextLines; i++ ) {
            _nextItems.push([]);
            for ( var j = 0; j < _nextRows; j++ ) {
                _nextItems[i].push(0);
            }
        }
        // refresh the stage
        _mainStage.refreshCanvas(_items, _styles, -1);
        
    };

    var _rotateNext = function() {
        var newItem = [];
        var height = _nextItem.length;
        var width = _nextItem[0].length;
        for ( var i = 0; i < width; i++ ) {
            newItem.push([]);
            for ( var j = 0; j < height; j++ ) {
                newItem[i].push(_nextItem[height-j-1][i]);
            }
        }
        _nextItem = newItem;
    };

    // rotate
    var _rotate = function() {
        
        var newItem = [];
        var height = _currentItem.item.length;
        var width = _currentItem.item[0].length;
        for ( var i = 0; i < width; i++ ) {
            newItem.push([]);
            for ( var j = 0; j < height; j++ ) {
                newItem[i].push(_currentItem.item[height-j-1][i]);
            }
        }
        var tempItem  = _currentItem.item;
        
        // try to add item to the stage, determine if we can add it to stage
        try {
            
            _currentItem.item = newItem;
            _putItemToStage();
            
        }
        catch (e) {
            // Oops, we can not add it
            _currentItem.item = tempItem;
            
        }
        finally {
            // we do not really want to add it here
            _removeItemFromStage();
        }
        // we do not want the item beyond the right side
        while ( _currentItem.x >  _rows - _currentItem.item.length ) {
            _currentItem.x --;
        }
        
    };

    // remove item from stage
    var _removeItemFromStage = function() {
        
        _putItemToStage(true);
        
    };

    var _putNextItemToBox = function() {
        for ( var i = 0; i < _nextLines; i++ ) {
            for ( var j = 0; j < _nextRows; j++ ) {
                _nextItems[i][j] = 0;
            }
        }
        var left = Math.floor((_nextLines - _nextItem.length) / 2);
        var top = Math.floor((_nextRows - _nextItem[0].length) / 2);
        for ( var i = 0; i < _nextItem.length; i++ ) {
            for ( var j = 0; j < _nextItem[0].length; j++ ) {
                _nextItems[j+top][i+left] = _nextItem[i][j];
            }
        }

    };

    // add/remove item to stage or determine whether it can be added to stage
    var _putItemToStage = function(remove) {
        
        if ( !_currentItem || !_currentItem.item ) {
            
            return;
        }
        for ( var i = _currentItem.item.length-1; i >= 0; i-- ) {
            for ( var j = _currentItem.item[i].length-1; j >= 0; j-- ) {
                // you wanna remove it?
                if ( remove && _currentItem.item[i][j] ) {
                        _items[_currentItem.y+j][_currentItem.x+i] = 0;
                } else if ( _currentItem.item[i][j] && _items[_currentItem.y+j][_currentItem.x+i] ) {
                    // Oh, we can't add it
                    throw "Overlap!";
                }
            }
        }
        if ( !remove ) {
            for ( var i = _currentItem.item.length-1; i >= 0; i-- ) {
                for ( var j = _currentItem.item[i].length-1; j >= 0; j-- ) {
                    if ( _currentItem.item[i][j] ) {
                        // Swap x and y, because the subscript and the axle, is different
                        _items[_currentItem.y+j][_currentItem.x+i] = _currentItem.item[i][j];
                    }
                }
            }
        }
        
    };

    // is the stage full? Game Over...
    var _isFull = function() {
        for ( var i = 0; i < _rows; i++ ) {
            if ( _items[2][i] ) {
                return true;
            }
        }
        return false;
    };

    // create a new item
    var _newItem = function() {
        
        if ( !_isFull() ) {
            _currentItem.item = _nextItem || _terisItem.getRandomItem();
            _currentItem.x = _centerLeft;
            _currentItem.y = 0;
            _putItemToStage();
            _nextItem = _terisItem.getRandomItem();
            for ( var i = 0; i < Math.floor(Math.random() * 4); i++ ) {
                _rotateNext();
            }
            _putNextItemToBox();
            _mainStage.refreshCanvas(_items, null, -1);
            _nextStage.refreshCanvas(_nextItems);
        }
        else {
            _gameOverCallback();
            clearInterval(_mainLoop);
        }
        
    };

    // go down!!
    var _fallDown = function() {
        
        if ( _currentItem.y < _lines - _currentItem.item[0].length ) {
            _currentItem.y ++;
        }
        else {
            // Baam, we don't want under the ground
            throw "Bottom!";
        }
        
    };

    // go left!
    var _moveLeft = function() {
        
        if ( _currentItem.x > 0 ) {
            try {
                _currentItem.x --;
                _putItemToStage();
            }
            catch (err) {
               // No, you can't go, back~ 
                _currentItem.x ++;
            }
            finally {
                _removeItemFromStage();
            }
        }
        
    };

    // go right
    var _moveRight = function() {
        
        if ( _currentItem.x < _rows - _currentItem.item.length ) {
            try {
                _currentItem.x ++;
                _putItemToStage();
            }
            catch (err) {
                // Back 
                _currentItem.x --;
            }
            finally {
                _removeItemFromStage();
            }
        }
        
    };

    // do we have a whole line?
    var _checkClearLines = function() {
        
        var clearLines = []
        for ( var i = 0; i < _lines; i++ ) {
            var isClear = true;
            for ( var j = 0; j < _rows; j++ ) {
                if ( !_items[i][j] ) {
                    isClear = false;
                    break;
                }
            }
            if ( isClear ) {
                clearLines.push(i);
            }
        }
        
        return clearLines;
    };

    // copy line to line
    var _copyLine = function(from, to) {
        
        if ( from == to ) {
            return ;
        }
        for ( var i = 0; i < _rows; i++ ) {
            _items[to][i] = _items[from][i];
        }
        
    };

    // remove successful lines
    var _removeClearLines = function() {
        
        var clearLines = _checkClearLines();
        if ( clearLines.length ) {
            var origin = _lines-1, target = _lines-1;
            for ( ; origin >= 0; origin-- ) {
                if ( clearLines.indexOf(origin) < 0 ) {
                    _copyLine(origin, target);
                    target--;
                }
            }
            for ( ; target >= 0; target-- ) {
                for ( var i = 0; i < _rows; i++ ) {
                    _items[target][i] = 0;
                }
            }
        }
        
        return clearLines.length;
    };

    // change the fall down speed
    var _changeSpeed = function(speed) {
        clearInterval(_mainLoop);
        _mainLoop = setInterval(_mainFunc, speed);
    };

    // monitor the key down event
    var _onKeyDown = function(evt) {
        evt = evt || window.event;
        keyCode = evt.charCode || evt.keyCode;
        _removeItemFromStage();
        switch ( keyCode ) {
            case 65:
            case 37:
                _moveLeft();
                break;
            case 68:
            case 39:
                _moveRight();
                break;
            case 87:
            case 38:
                _rotate();
                break;
            case 83:
            case 40:
                if ( !_isFast ) {
                    _isFast = true;
                    _changeSpeed(FAST_SPEED);
                }
           
        }
        _putItemToStage();
        _mainStage.refreshCanvas(_items, null, -1);
    };

    // monitor the key up event
    var _onKeyUp = function(evt) {
        evt = evt || window.event;
        keyCode = evt.charCode || evt.keyCode;
        if ( keyCode == 83 || keyCode == 40 ) {
            _changeSpeed(NORMAL_SPEED);
            _isFast = false;
        }
    };

    // update the score
    var _updateScore = function() {
        if ( _updateScoreCallback ) {
            _updateScoreCallback(_score);
        }
    };

    var _addUpdateScoreCallback = function(callback) {
        _updateScoreCallback = callback;
    };

    var _addGameOverCallback = function(callback) {
        _gameOverCallback = callback;
    };

    // main loop function
    var _mainFunc = function() {
        try {
            _removeItemFromStage();
            _fallDown();
            _putItemToStage();
        }
        catch (e) {
            if ( e == "Overlap!" ) {
                _currentItem.y --;
            }
            _putItemToStage();
            _score += _removeClearLines();
            _updateScore();
            _newItem();
        }
        finally {
            _mainStage.refreshCanvas(_items, null, -1);
        }
    }

    // Game start!
    var _start = function() {
        _init();
        _newItem();
        _mainLoop = setInterval(_mainFunc, NORMAL_SPEED);
    };

    this.start = _start;
    this.onKeyDown = _onKeyDown;
    this.onKeyUp = _onKeyUp;
    this.addUpdateScoreCallback = _addUpdateScoreCallback;
    this.addGameOverCallback = _addGameOverCallback;
};

function updateScore(score) {
    document.getElementById('score').innerHTML = score;
}

function gameStart() {
    document.onkeydown = game.onKeyDown;
    document.onkeyup = game.onKeyUp;
    game.addUpdateScoreCallback(updateScore);
    game.addGameOverCallback(gameover);
    var startButton  = document.getElementById('start');
    if ( !startButton.disabled ) {
        game.start();
        startButton.disabled = true;
    }
}

function gameover() {
    alert("Game Over!");
    document.getElementById('start').disabled = false;
}

function onLoad() {
    game = new Game(document.getElementById('game').getContext('2d'), document.getElementById('next').getContext('2d'));
}
