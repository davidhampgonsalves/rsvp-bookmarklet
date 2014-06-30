javascript:(function() {
    var text = getSelectedText();

    if(!text) {
        /* TODO: send page to api to get only content and then read that */
        /*https://app.embed.ly*/
        alert('please select some text to read.');
        return;
    }

    var model = {
        index : 0,
        lastTextChange : new Date().getTime() - 99999999,
        baseInterval : 60000 / 500
    };

    setupMainContainer(model);
    setupKeyboardControl(model);
    updateWPM(model);

    model.words = getWords(text);

    read.apply(model);

    function setupKeyboardControl(model) {
        document.onkeydown = function(e) {
            var key = e.keyCode;

            /* treat up and down arrows like +/- */
            if(key === 38)
                key = 187;
            else if(key === 40)
                key = 189;

            var noAction = false;
            switch (key) {
                case 27:
                    finish(model);
                    break;
                case 32:
                    /*spacebar pauses reading*/
                    model.pause = !model.pause;
                    break;
                case 37:
                    /* jump back 20 words and then draw a single frame if paused */
                    model.index = model.index > 20 ? model.index-20 : 0;
                    if(model.pause)
                        read.apply(model, [null, true]);
                    break;
                case 39:
                    /* jump forward 20 words and then draw a single frame if paused */
                    model.index += 20;
                    if(model.index >= model.words.length)
                        model.index = model.words.length-1;
                    if(model.pause)
                        read.apply(model, [null, true]);
                    break;
                case 82:
                    /*toggle rewind when 'r' is pressed*/
                    model.rewind = true;
                    model.pause = false;
                    break;
                case 187:
                    model.baseInterval = 60000 / ((60000 / model.baseInterval) + 5);
                    updateWPM(model);
                    break;
                case 189:
                    model.baseInterval = 60000 / ((60000 / model.baseInterval) - 5);
                    updateWPM(model);
                    break;
                default:
                    noAction = true;
            };

            /* disable key propigation if its a command key */
            if(!noAction)
                e.preventDefault();
        };

        document.onkeyup = function(e) {
            switch (e.keyCode) {
                case 82:
                    model.rewind = false;
            };
        };
    }

    function finish(model) {
        window.cancelAnimationFrame(model.nextAnimation);
        if(model && model.container && model.container.parentNode)
            model.container.parentNode.removeChild(model.container);
    }

    function updateWPM(model, baseInterval) {
        if(!baseInterval)
            baseInterval = model.baseInterval;

        model.wpmContainer.innerHTML = Math.floor(60000 / baseInterval) + 'wpm';
    };

    function getWords(text) {
        return text.split(/[\s]+/g).filter(nonEmpty);
    };

    function splitWord(word) {
        if(word.length === 1)
            return ['', word, ''];

        var pivot = 1;

        switch (word.length) {
            case 0:
            case 1:
                pivot = 0;
                break;
            case 2:
            case 3:
            case 4:
            case 5:
                pivot = 1;
                break;
            case 6:
            case 7:
            case 8:
            case 9:
                pivot = 2;
                break;
            case 10:
            case 11:
            case 12:
            case 13:
                pivot = 3;
                break;
            default:
                pivot = 4;
        };

        return [word.substring(0,pivot), word.substring(pivot, pivot+1), word.substring(pivot+1)];
    };

    function nonEmpty(x) {
        return x.length > 0;
    };

    function read(time, isSingleFrame) {

        var now = new Date().getTime();
        if(!isSingleFrame && ((new Date().getTime() - this.lastTextChange) < this.nextInterval || model.pause)) {
            this.nextAnimation = window.requestAnimationFrame(read.bind(this));
            return;
        }

        var word = this.words[this.index];
        var wordParts = splitWord(word);

        var center = this.canvas.width / 2;
        var charWidth = this.canvasContext.measureText(wordParts[1]).width;
        var vAlign = this.canvas.height / 2;

        this.canvasContext.clearRect (0, 0, this.canvas.width, this.canvas.height);

        this.canvasContext.fillStyle = 'black';
        this.canvasContext.textAlign = 'right';
        this.canvasContext.fillText(wordParts[0], center - (charWidth/2), vAlign);

        this.canvasContext.textAlign = 'center';
        this.canvasContext.fillStyle = 'red';
        this.canvasContext.fillText(wordParts[1], center, vAlign);

        this.canvasContext.fillStyle = 'black';
        this.canvasContext.textAlign = 'left';
        this.canvasContext.fillText(wordParts[2], center + (charWidth/2), vAlign);

        if(!this.rewind) {
            if((this.index + 1) < this.words.length)
                this.index += 1;
        } else if(this.index > 0)
            this.index -= 1;

        this.lastTextChange = now;

        /* this should be moved to a different structure that runs all the rules and only builds the regex once */
        if(this.index < 5) {
            this.nextInterval = this.baseInterval * (5 - this.index);
        } else if(/(\.|\?|!).[^a-zA-Z\d\s:]?$/.test(word)) {
            /* slow down for weird(special chars) words */
            this.nextInterval = this.baseInterval * 3;
        } else if(/.[^a-zA-Z\d\s:]$/.test(word)) {
            /* slow down for weird(special chars) words */
            this.nextInterval = this.baseInterval * 2;
        } else if(word.length > 7) {
            /* slow down for longer words */
            this.nextInterval = this.baseInterval * (1 + (0.2 * Math.sqrt(word.length)));
        } else if(/^[^a-zA-Z\d\s:]/.test(word)) {
            /* slow down for beginning of quote or paragraph or weird chars */
            this.nextInterval = this.baseInterval * 2;
        } else if(/[^a-zA-Z\d\s:]$/.test(word)) {
            this.nextInterval = this.baseInterval * 1.3;
        } else {
            this.nextInterval = this.baseInterval;
        }

        //console.log(this.nextInterval);

        if(!isSingleFrame)
            this.nextAnimation = window.requestAnimationFrame(read.bind(this));
    };

    function applyStylesToNode(node, styles) {
        resetStyles(node);

        /*TODO: add base reset styles first*/
        for(var attr in styles) {
            node.style[attr]=styles[attr];
        }
    };

    function resetStyles(node) {
        if(!node)
            console.error('node was invalid: ' + node);
        /*reset all css*/
        var props = window.getComputedStyle(node, null);
        for(var i=0, len=props.length ; i < len ; i++) {
            node.style[props] = 'initial';
        }
    };

    function getSelectedText() {
        var html = null;
        if (typeof window.getSelection != 'undefined') {
            var sel = window.getSelection();
            if (sel.rangeCount) {
                var container = document.createElement('div');
                for (var i = 0, len = sel.rangeCount; i < len; ++i) {
                    container.appendChild(sel.getRangeAt(i).cloneContents());
                }

                /* Some sites don't have spaces between paragraphs, which stuffs up our word splitting later. */
                /* Assumes p's are children of container. */
                for (var i = 0; i < container.childNodes.length; i++) {
                    tagname = container.childNodes[i].tagName || container.childNodes[i].nodeName;
                    if (tagname.toLowerCase() == 'p') {
                        container.childNodes[i].innerHTML += ' ';
                    }
                }

                html = container.innerHTML;
            }
        } else if (typeof document.selection != 'undefined') {
            if (document.selection.type == 'Text') {
                html = document.selection.createRange().htmlText;
            }
        }

        var tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText;
    };

    function setupMainContainer(model) {

        var container = document.getElementById('davidhampgonsalves-container-1234kj1;2l3k4j');

        /* remove lost containers(caused by clicking bookmarklet multiple times) */
        if(container) {
            if(container.parentNode)
                container.parentNode.removeChild(container);
        }

        container = document.createElement('div');
        container.setAttribute('id', 'davidhampgonsalves-container-1234kj1;2l3k4j');

        var styles = {position:'fixed',
            display:'table',
            border: '20px solid #333',
            background:'#EEE',
            width: '400px',
            height:'150px',
            top:'50%',
            left:'50%',
            'margin-top':'-100px',
            'margin-left':'-150px',
            'font-family':'Arial',
            'font-size':'15px',
            'text-align': 'center',
            'z-index' : '9999999999999999999'
        };
        applyStylesToNode(container, styles);

        var wordContainer = document.createElement('canvas');
        applyStylesToNode(wordContainer, {height: '150px', width:'300px'});
        model.canvas = wordContainer;
        model.canvasContext = wordContainer.getContext('2d');
        model.canvasContext.font='30px Georgia';

        model.wpmContainer = document.createElement('div');
        applyStylesToNode(model.wpmContainer, {margin:'10px', 'text-align':'left', width:'100px', position:'absolute', bottom:'0', left:'0'});

        var aboutLink =  document.createElement('a');
        aboutLink.appendChild(document.createTextNode('?'));
        aboutLink.href='http://www.davidhampgonsalves.com/spritz-like-rsvp-reader-bookmarklet/';
        aboutLink.target='_blank';
        applyStylesToNode(aboutLink, {margin:'10px', 'text-align':'right', width:'100px', position:'absolute', bottom:'0', right:'0', 'text-decoration': 'none'});

        container.appendChild(wordContainer);
        container.appendChild(model.wpmContainer);
        container.appendChild(aboutLink);

        document.body.appendChild(container);
        model.container = container;
    };

}());