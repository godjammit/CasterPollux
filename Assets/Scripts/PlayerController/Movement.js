#pragma strict

//networking
var thisName : String = "Bugged name";
var localPlayer : boolean = false;

function OnNetworkInstantiate (msg : NetworkMessageInfo) {
	// This is our own player
	if (networkView.isMine)
	{
		localPlayer=true;
		
		networkView.RPC("setName", RPCMode.Others, thisName);
		
		SmoothFollow2D.target = this.gameObject.transform;
		
		thisName=PlayerPrefs.GetString("playerName");
	}
	// This is just some remote controlled player, don't execute direct
	// user input on this. DO enable multiplayer controll
	else
	{
		thisName="Remote"+Random.Range(1,10);
		name += thisName;
			
		//networkView.RPC("askName", networkView.viewID.owner, Network.player);
		
	
	}
}


@RPC
function setName(name : String){
	thisName=name;
}

@RPC
function askName(asker : NetworkPlayer){
	//networkView.RPC("setName", asker, thisName);
}





// The player can make jumps, doublejumps and dash.
//Basically uploading everything I made that is psuedo-important

// The script is in need for the Input Axes: "Horizontal", "Vertical", "Jump" and "Run".
// You need to add "Run" by yourself:
// In Unity: Click on Edit->Project Settings->Input - In the Inspector, name one of the axes to "Run" and 
// let the positive value be "right shift". To add a new axis, just type a greater number into the size 
// property at the top.

// is the player at all controllable?
var isControllable = true;

var canJump=true;            // can the player jump? if not, he can also not doublejump and walljump
var canDoubleJump=true;        // can the player jump after a jump?
var canWallJump=true;        // can the player jump away from a wall when touching it?
var canDash=true;        // can the player jump away from a wall when touching it?
var canSprint=true;
var dashtimer=10.0;
var hasdashed=false;
private var actualdashtimer=0.0;
private var dashdirection : int = 0;
var jumpHeight = 1.5;         // this is the jump height by pressing it the first time.
var doubleJumpHeight=1.0;     // this height will be added to verticalspeed one the jump button is pressed the second time.

var walkingSpeed=6.0;        // the normal walking speed.
var runningSpeed=12.0;
var speedSmoothing = 10.0;
var sidewayWalkMultiplier=0.5;
var inAirControl = 0.6;

// The gravity for the character
var gravity = 20.0;

private var dash : boolean;

private var moveDirection:Vector3 = Vector3.zero;
private var faceDirection:Vector3 =Vector3.zero;
private var moveSpeed=0.0;
private var verticalSpeed=0.0;

// when can the player jump again?
private var jumpRepeatTime = 0.05;
private var jumping=false;
private var doubleJumping=false;
private var rightFacing=true;
private var lastJumpButtonTime=-10.0;
// When did we touch the wall the first time during this jump (Used for wall jumping)
private var touchWallJumpTime = -1.0;
private var wallJumpTimeout = 0.15;

// Last time we performed a jump
private var lastJumpTime = -1.0;
private var jumpTimeout = 0.15;
// Is the user pressing any keys?
private var isMoving = false;
private var jumpingReachedApex=false;
// Average normal of the last touched geometry
private var wallJumpContactNormal : Vector3;

// The last collision flags returned from controller.Move
private var collisionFlags : CollisionFlags; 

private var jumpButtonPressedTwice=0;

private var movement = Vector3(0, 0, 0);


function Awake ()
{
    moveDirection = transform.TransformDirection(Vector3.forward);
}

function Update () 
{
	if (! localPlayer)
		return;
		
	if (! this.gameObject.networkView.isMine)
		return;

	if (pk.isPK)
		return;

    // kill all inputs if not controllable
    if (!isControllable) {Input.ResetInputAxes();}

	transform.position.z = 0;
			
	//tracks if the button combo for falling through is pressed
    //usually in video games this is down + jump
    if(Input.GetAxis("Vertical") < 0){
         //the layer moving platforms cannot collide with
        gameObject.layer = 8;
    }
    else{
        gameObject.layer = 0; //default layer
    }

    // set the jump button time variable and check for a doublejump. (=jumpButtonPressedTwice==1)
    if (Input.GetButtonDown ("Jump") || TouchMovement.jump) 
    {
        if(jumpButtonPressedTwice==-2)    // it was set the second time..
            jumpButtonPressedTwice=1;    // thats a double jump
        else
            jumpButtonPressedTwice=-1;    // set it the first time..
        lastJumpButtonTime = Time.time;
    }
    
    //Gets the latest faceing of the character
    if (Input.GetAxisRaw("Horizontal") < 0 || TouchMovement.left) 
    {
		rightFacing = false;
    }
    else if (Input.GetAxisRaw("Horizontal") > 0 || TouchMovement.right) 
    {
    	rightFacing = true;
    }
    
    // check if jump button was pressed the second time
    if(Input.GetButtonUp("Jump") || TouchMovement.jump)
    {
        if(jumpButtonPressedTwice==-1)    // set it the second time
            jumpButtonPressedTwice=-2;
    }
    
    UpdateSmoothedMovementDirection();
    
    // Perform a wall jump logic
    // - Make sure we are jumping against wall etc.
    // - Then apply jump in the right direction)
    if (canWallJump)
        ApplyWallJump();
    
    // Apply jumping logic
    ApplyJumping();
    
    movement = moveDirection * moveSpeed + Vector3 (0, verticalSpeed, 0);// + inAirVelocity;
    movement *= Time.deltaTime;
    
    if (dash)
    	movement.y = 0;
    
    // Move the controller
    var controller : CharacterController = GetComponent(CharacterController);
    wallJumpContactNormal = Vector3.zero;
    collisionFlags = controller.Move(movement);
    
    // rotate the character
    // TODO: lerp or slerp it (? wich one, and why?)
    transform.rotation = Quaternion.LookRotation(faceDirection);
    
    // We are in jump mode but just became grounded
    if (IsGrounded())
    {
        //lastGroundedTime = Time.time;
        //inAirVelocity = Vector3.zero;
        if (jumping || doubleJumping)
        {
            jumping = false;
            doubleJumping=false;
            jumpButtonPressedTwice=0;
            SendMessage("DidLand", SendMessageOptions.DontRequireReceiver);
        }
    }
}

function UpdateSmoothedMovementDirection()
{
    var cameraTransform = Camera.main.transform;
    var grounded = IsGrounded();
    
    // Forward vector relative to the camera along the x-z plane    
    var forward = cameraTransform.TransformDirection(Vector3.forward);
    forward.y = 0;
    forward = forward.normalized;

    // Right vector relative to the camera
    // Always orthogonal to the forward vector
    var right = Vector3(forward.z, 0, -forward.x);
    // get the input axes
    //var vertical = Input.GetAxisRaw("Vertical");
    var vertical = 0;
    var horizontal = Input.GetAxisRaw("Horizontal");
    
    if (TouchMovement.right)
    	horizontal = 1;
    if (TouchMovement.left)
    	horizontal = -1;
    
    //var wasMoving = isMoving;
    isMoving = Mathf.Abs (horizontal) > 0.1 || Mathf.Abs (vertical) > 0.1;
    
    faceDirection = Vector3.Slerp(faceDirection, forward,Time.deltaTime*8);
    var targetDir=forward*vertical+right*horizontal*sidewayWalkMultiplier;
    
    
    dash = false;
    if(Input.GetButton("Dash") && canDash && !hasdashed)
	{
		hasdashed = true;
		dash = true;
		actualdashtimer = dashtimer;
		dashdirection = 0;
	}
    
    var curSmooth:float;
    var targetSpeed:float;
    
    if(dash || actualdashtimer > 0)
    {
    	dash = true;
    	actualdashtimer -= Time.deltaTime;
    	movement.y = 0;
    	
    	// We store speed and direction seperately,
        // so that when the character stands still we still have a valid forward direction
        // moveDirection is always normalized, and we only update it if there is user input.
        if (faceDirection != Vector3.zero)
        {
            moveDirection = targetDir.normalized;
        }
        
        if(rightFacing && dashdirection == 0)
    		dashdirection = 1;
    	else if (dashdirection == 0)
    		dashdirection = -1;
        
        if(dashdirection == 1)
    		moveDirection = Vector3.right;
    	else if (dashdirection == -1)
    		moveDirection = -Vector3.right;
        
        // Smooth the speed based on the current target direction
        curSmooth = speedSmoothing * Time.deltaTime;
        
        // Choose target speed
        //* We want to support analog input but make sure you cant walk faster diagonally than just forward or sideways
        targetSpeed = 1.0;
    
        targetSpeed *= walkingSpeed;
        
        moveSpeed = Mathf.Lerp(moveSpeed, targetSpeed, curSmooth);
    }
    
    // Grounded controls
    else if (grounded)
    {
    	hasdashed = false;
        // We store speed and direction seperately,
        // so that when the character stands still we still have a valid forward direction
        // moveDirection is always normalized, and we only update it if there is user input.
        if (faceDirection != Vector3.zero)
        {
            moveDirection = targetDir.normalized;
        }
        
        // Smooth the speed based on the current target direction
        curSmooth = speedSmoothing * Time.deltaTime;
        
        // Choose target speed
        //* We want to support analog input but make sure you cant walk faster diagonally than just forward or sideways
        targetSpeed = Mathf.Min(targetDir.magnitude, 1.0);
    
        // Pick speed modifier
        if (Input.GetButton ("Run") && canSprint)
        {
            targetSpeed *= runningSpeed;
        }else{
            targetSpeed *= walkingSpeed;
        }
        
        moveSpeed = Mathf.Lerp(moveSpeed, targetSpeed, curSmooth);
        ApplyGravity ();
    }
    else if(!canWallJump)
    {
        if (faceDirection != Vector3.zero)
        {
            moveDirection = targetDir.normalized;
        }
        
        curSmooth = speedSmoothing * Time.deltaTime;
    	targetSpeed = Mathf.Min(targetDir.magnitude, 1.0);
        
        // Pick speed modifier
        if (Input.GetButton ("Run"))
        {
            targetSpeed *= runningSpeed;
        }else{
            targetSpeed *= walkingSpeed;
        }
        
        moveSpeed = Mathf.Lerp(moveSpeed, targetSpeed*inAirControl, curSmooth);
        ApplyGravity ();
    } else {
    	movement = Vector3(0, 0, 0);
    	ApplyGravity ();
    }
    
}

function ApplyGravity ()
{
    if (isControllable)    // don't move player at all if not controllable.
    {        
        // When we reach the apex of the jump we send out a message
        if (jumping && !jumpingReachedApex && verticalSpeed <= 0.0)
        {
            jumpingReachedApex = true;
            SendMessage("DidJumpReachApex", SendMessageOptions.DontRequireReceiver);
        }
        
        if (IsGrounded ())
            verticalSpeed = 0.0;
        else
            verticalSpeed -= gravity * Time.deltaTime;
    }
}

function ApplyWallJump()
{
    if(!jumping)
        return;
    
    // if the a side was hit, set the time
    if(collisionFlags==CollisionFlags.CollidedSides)
    {
        touchWallJumpTime=Time.time;
    }
    
    // The user can trigger a wall jump by hitting the button shortly before or shortly after hitting the wall the first time.
    var mayJump = lastJumpButtonTime > touchWallJumpTime - wallJumpTimeout && lastJumpButtonTime < touchWallJumpTime + wallJumpTimeout;
    if (!mayJump)
        return;
    
    // Prevent jumping too fast after each other
    if (lastJumpTime + jumpRepeatTime > Time.time)
        return;
    
    if (Mathf.Abs(wallJumpContactNormal.y) < 0.2)
    {
        wallJumpContactNormal.y = 0;
        moveDirection = wallJumpContactNormal.normalized;
        // Wall jump gives us at least trotspeed
        moveSpeed = Mathf.Clamp(moveSpeed * 1.5, walkingSpeed, runningSpeed);
        // after a walljump we cannot doublejump
        doubleJumping=true;
        DidJump();
        SendMessage("DidWallJump", null, SendMessageOptions.DontRequireReceiver);
        Camera.main.SendMessage("TurnAround", SendMessageOptions.DontRequireReceiver);
    }else{
      // cannot walljump again
        moveSpeed = 0;
    }
    
    verticalSpeed = CalculateJumpVerticalSpeed (jumpHeight);
}


function ApplyJumping()
{
    // Prevent jumping too fast after each other
    if (doubleJumping && lastJumpTime + jumpRepeatTime > Time.time)
        return;
    
    if(jumping && !doubleJumping && jumpButtonPressedTwice==1 && canDoubleJump)
    {
        // Perform a doublejump
        doubleJumping=true;
        //if(verticalSpeed>0.0)
            verticalSpeed=0;
        verticalSpeed+=CalculateJumpVerticalSpeed(doubleJumpHeight);
        DidJump();
        SendMessage("DidDoubleJump", SendMessageOptions.DontRequireReceiver);
    }else{    
        if (IsGrounded()) 
        {
            var height=jumpHeight;    
            if (canJump && Time.time < lastJumpButtonTime + jumpTimeout) 
            {
                // Jump
                // - Only when pressing the button down
                // - With a timeout so you can press the button slightly before landing
                verticalSpeed = CalculateJumpVerticalSpeed (jumpHeight);
                SendMessage("DidJump", SendMessageOptions.DontRequireReceiver);
            }
        }
    }
}

function DidJump ()
{
    jumping = true;
    jumpingReachedApex = false;
    lastJumpTime = Time.time;
    //lastJumpStartHeight = transform.position.y;
    touchWallJumpTime = -1;
    lastJumpButtonTime = -10;
}

function CalculateJumpVerticalSpeed (targetJumpHeight : float)
{
    // From the jump height and gravity we deduce the upwards speed 
    // for the character to reach at the apex.
    return Mathf.Sqrt(2 * targetJumpHeight * gravity);
}

// This function responds to the "HidePlayer" message by hiding the player. 
// The message is also 'replied to' by identically-named functions in the collision-handling scripts.
// - Used by the LevelStatus script when the level completed animation is triggered.
function HidePlayer()
{
    GameObject.Find("rootJoint").GetComponent(SkinnedMeshRenderer).enabled = false; // stop rendering the player.
    isControllable = false;    // disable player controls.
}

// This is a complementary function to the above. We don't use it in the tutorial, but it's included for
// the sake of completeness. (I like orthogonal APIs; so sue me!)
function ShowPlayer()
{
    GameObject.Find("rootJoint").GetComponent(SkinnedMeshRenderer).enabled = true; // start rendering the player again.
    isControllable = true;    // allow player to control the character again.
}

// returns true if the player is moving
function IsMoving ()  : boolean
{
    return Mathf.Abs(Input.GetAxisRaw("Vertical")) + Mathf.Abs(Input.GetAxisRaw("Horizontal")) > 0.5;
}

// returns if the player is on ground or not
function IsGrounded ():boolean {
    return (collisionFlags & CollisionFlags.CollidedBelow) != 0;
}

function OnControllerColliderHit (hit : ControllerColliderHit )
{
//    Debug.DrawRay(hit.point, hit.normal);
    if (hit.moveDirection.y > 0.01) 
        return;
    wallJumpContactNormal = hit.normal;
}