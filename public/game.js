var game;

var gameOptions = {

    // start vertical point of the terrain, 0 = very top; 1 = very bottom
    startTerrainHeight: 0.5,

    // max slope amplitude, in pixels
    amplitude: 100,

    // slope length range, in pixels
    slopeLength: [150, 350],

    // a mountain is a a group of slopes.
    mountainsAmount: 3,

    // amount of slopes for each mountain
    slopesPerMountain: 6,

    // car acceleration
    carAcceleration: 0.01,

    // maximum car velocity
    maxCarVelocity: 1
}
window.onload = function() {
    let gameConfig = {
        type: Phaser.AUTO,
        backgroundColor: 0x75d5e3,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            parent: "georover",
            width: 800,
            height: 500
        },
        physics: {
            default: "matter",
            matter: {
                debug: true,
                debugBodyColor: 0x00000
            }
        },
        scene: playGame
    }
    game = new Phaser.Game(gameConfig);
    window.focus();
}
class playGame extends Phaser.Scene{
    constructor(){
        super("PlayGame");
    }
    create(){

        // creation of pool arrays
        this.bodyPool = [];
        this.bodyPoolId = [];

        // array to store mountains
        this.mountainGraphics = [];

        // mountain start coordinates
        this.mountainStart = new Phaser.Math.Vector2(0, 0);

        // loop through all mountains
        for(let i = 0; i < gameOptions.mountainsAmount; i++){

            // each mountain is a graphics object
            this.mountainGraphics[i] = this.add.graphics();

            // generateTerrain is the method to generate the terrain. The arguments are the graphics object and the start position
            this.mountainStart = this.generateTerrain(this.mountainGraphics[i], this.mountainStart);
        }

        // method to add the car, arguments represent x and y position
        this.addCar(250, game.config.height / 2 - 70);

        // the car is not accelerating
        this.isAccelerating = false;

        // input management
        this.input.on("pointerdown", this.accelerate, this);
        this.input.on("pointerup", this.decelerate, this);

        // collision check between the diamond and the car. Any other diamond collision is not allowed
        this.matter.world.on("collisionstart", function(event, bodyA, bodyB){
            if((bodyA.label == "diamond" && bodyB.label != "car") || (bodyB.label == "diamond" && bodyA.label != "car")){
                this.scene.start("PlayGame")
            }

        }.bind(this));
    }

    // method to generate the terrain. Arguments: the graphics object and the start position
    generateTerrain(graphics, mountainStart){

        // array to store slope points
        let slopePoints = [];

        // variable to count the amount of slopes
        let slopes = 0;

        // slope start point
        let slopeStart = new Phaser.Math.Vector2(0, mountainStart.y);

        // set a random slope length
        let slopeLength = Phaser.Math.Between(gameOptions.slopeLength[0], gameOptions.slopeLength[1]);

        // determine slope end point, with an exception if this is the first slope of the fist mountain: we want it to be flat
        let slopeEnd = (mountainStart.x == 0) ? new Phaser.Math.Vector2(slopeStart.x + gameOptions.slopeLength[1] * 1.5, 0) : new Phaser.Math.Vector2(slopeStart.x + slopeLength, Math.random());

        // current horizontal point
        let pointX = 0;

        // while we have less slopes than regular slopes amount per mountain...
        while(slopes < gameOptions.slopesPerMountain){

            // slope interpolation value
            let interpolationVal = this.interpolate(slopeStart.y, slopeEnd.y, (pointX - slopeStart.x) / (slopeEnd.x - slopeStart.x));

            // if current point is at the end of the slope...
            if(pointX == slopeEnd.x){

                // increase slopes amount
                slopes ++;

                // next slope start position
                slopeStart = new Phaser.Math.Vector2(pointX, slopeEnd.y);

                // next slope end position
                slopeEnd = new Phaser.Math.Vector2(slopeEnd.x + Phaser.Math.Between(gameOptions.slopeLength[0], gameOptions.slopeLength[1]), Math.random());

                // no need to interpolate, we use slope start y value
                interpolationVal = slopeStart.y;
            }

            // current vertical point
            let pointY = game.config.height * gameOptions.startTerrainHeight + interpolationVal * gameOptions.amplitude;

            // add new point to slopePoints array
            slopePoints.push(new Phaser.Math.Vector2(pointX, pointY));

            // move on to next point
            pointX ++ ;
        }

        // simplify the slope
        let simpleSlope = simplify(slopePoints, 1, true);

        // place graphics object
        graphics.x = mountainStart.x;

        // draw the ground
        graphics.clear();
        graphics.moveTo(0, game.config.height * 2);
        graphics.fillStyle(0x654b35);
        graphics.beginPath();
        simpleSlope.forEach(function(point){
            graphics.lineTo(point.x, point.y);
        }.bind(this))
        graphics.lineTo(pointX, game.config.height * 2);
        graphics.lineTo(0, game.config.height * 2);
        graphics.closePath();
        graphics.fillPath();

        // draw the grass
        graphics.lineStyle(16, 0x6b9b1e);
        graphics.beginPath();
        simpleSlope.forEach(function(point){
            graphics.lineTo(point.x, point.y);
        })
        graphics.strokePath();

        // loop through all simpleSlope points starting from the second
        for(let i = 1; i < simpleSlope.length; i++){

            // define a line between previous and current simpleSlope points
            let line = new Phaser.Geom.Line(simpleSlope[i - 1].x, simpleSlope[i - 1].y, simpleSlope[i].x, simpleSlope[i].y);

            // calculate line length, which is the distance between the two points
            let distance = Phaser.Geom.Line.Length(line);

            // calculate the center of the line
            let center = Phaser.Geom.Line.GetPoint(line, 0.5);

            // calculate line angle
            let angle = Phaser.Geom.Line.Angle(line);

            // if the pool is empty...
            if(this.bodyPool.length == 0){

                // create a new rectangle body
                this.matter.add.rectangle(center.x + mountainStart.x, center.y, distance, 10, {
                    isStatic: true,
                    angle: angle,
                    friction: 1,
                    restitution: 0
                });
            }

            // if the pool is not empty...
            else{

                // get the body from the pool
                let body = this.bodyPool.shift();
                this.bodyPoolId.shift();

                // reset, reshape and move the body to its new position
                this.matter.body.setPosition(body, {
                    x: center.x + mountainStart.x,
                    y: center.y
                });
                let length = body.area / 10;
                this.matter.body.setAngle(body, 0)
                this.matter.body.scale(body, 1 / length, 1);
                this.matter.body.scale(body, distance, 1);
                this.matter.body.setAngle(body, angle);
            }
        }

        // assign a custom "width" property to the graphics object
        graphics.width = pointX - 1

        // return the coordinates of last mountain point
        return new Phaser.Math.Vector2(graphics.x + pointX - 1, slopeStart.y);
    }

    // method to build the car
    addCar(posX, posY){

        // car is made by three rectangle bodies which will be merged into a compound object
        let floor = Phaser.Physics.Matter.Matter.Bodies.rectangle(posX, posY, 100, 10, {
            label: "car"
        });
        let rightBarrier = Phaser.Physics.Matter.Matter.Bodies.rectangle(posX + 45, posY - 15, 10, 20, {
            label: "car"
        });
        let leftBarrier = Phaser.Physics.Matter.Matter.Bodies.rectangle(posX - 45, posY - 15, 10, 20, {
            label: "car"
        });

        // this is how we create the compound object
        this.body = Phaser.Physics.Matter.Matter.Body.create({

            // array of single bodies
            parts: [floor, leftBarrier, rightBarrier],
            friction: 1,
            restitution: 0
        });

        // add the body to the world
        this.matter.world.add(this.body);

        // the diamond. It cannot fall off the car
        this.diamond = this.matter.add.rectangle(posX, posY - 40, 30, 30, {
            friction: 1,
            restitution: 0,
            label: "diamond"
        });

        // add front wheel. A circle
        this.frontWheel = this.matter.add.circle(posX + 35, posY + 25, 30, {
            friction: 1,
            restitution: 0
        });

        // add rear wheel
        this.rearWheel = this.matter.add.circle(posX - 35, posY + 25, 30, {
            friction: 1,
            restitution: 0
        });

        // these two constraints will bind front wheel to the body
        this.matter.add.constraint(this.body, this.frontWheel, 40, 0, {
            pointA: {
                x: 30,
                y: 10
            }
        });
        this.matter.add.constraint(this.body, this.frontWheel, 40, 0, {
            pointA: {
                x: 45,
                y: 10
            }
        });

        // same thing for rear wheel
        this.matter.add.constraint(this.body, this.rearWheel, 40, 0, {
            pointA: {
                x: -30,
                y: 10
            }
        });
        this.matter.add.constraint(this.body, this.rearWheel, 40, 0, {
            pointA: {
                x: -45,
                y: 10
            }
        });
    }

    // method to accelerate
    accelerate(){
        this.isAccelerating = true;
    }

    // method to decelerate
    decelerate(){
        this.isAccelerating = false;
    }

    update(){

        // zoom is calculated according to car speed.
        // zoom = 1: no zoom
        // zoom > 1: zoom in
        // zoom < 1: zoom out
        let zoom = 1 - Phaser.Math.Clamp(this.body.speed, 0, 15) / 25

        // zoomTo method allows the camera to zoom at "zoom" ratio in 1000 milliseconds
        // the most important argument is the 4th argument.
        // If set to "false", camera won't adjust its zoom if already zooming.
        this.cameras.main.zoomTo(zoom, 1000, "Linear", false);

        // make the game follow the car
        this.cameras.main.scrollX = this.body.position.x - game.config.width / 4 + game.config.width * (1 - this.cameras.main.zoom);
        this.cameras.main.scrollY = this.body.position.y - game.config.height / 2.2

        // adjust velocity according to acceleration
        if(this.isAccelerating){
            let velocity = this.frontWheel.angularSpeed + gameOptions.carAcceleration;
            velocity = Phaser.Math.Clamp(velocity, 0, gameOptions.maxCarVelocity);

            // set angular velocity to wheels
            this.matter.body.setAngularVelocity(this.frontWheel, velocity);
            this.matter.body.setAngularVelocity(this.rearWheel, velocity);
        }

        // loop through all mountains
        this.mountainGraphics.forEach(function(item){

            // if the mountain leaves the screen to the left...
            if(this.cameras.main.scrollX > item.x + item.width + game.config.width){

                // reuse the mountain
                this.mountainStart = this.generateTerrain(item, this.mountainStart)
            }
        }.bind(this));

        // get all bodies
        let bodies = this.matter.world.localWorld.bodies;

        // loop through all bodies
        bodies.forEach(function(body){

            // if the body is out of camera view to the left side and is not yet in the pool..
            if(this.cameras.main.scrollX > body.position.x + game.config.width && this.bodyPoolId.indexOf(body.id) == -1){

                // ...add the body to the pool
                this.bodyPool.push(body);
                this.bodyPoolId.push(body.id);
            }
        }.bind(this))
    }

    // method to apply a cosine interpolation between two points
    interpolate(vFrom, vTo, delta){
        let interpolation = (1 - Math.cos(delta * Math.PI)) * 0.5;
        return vFrom * (1 - interpolation) + vTo * interpolation;
    }
}
