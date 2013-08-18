#pragma strict

static public var left : boolean = false;
static public var right : boolean = false;
static public var jump : boolean = false;

function Start () {
	if (Application.platform == RuntimePlatform.Android || Application.platform == RuntimePlatform.IPhonePlayer) 
		return;
	else
		Destroy(this);
}

function Update () { 
	left = false;
	right = false;
	jump = false;
	if (Input.touches.Length >= 1) 
	{
		if (Input.GetTouch(0).position.x < Screen.width/2)
			left = true;
		else
			right = true;
			
		if (Input.GetTouch(0).position.y > 2*Screen.height/3)
			jump = true;
	}
}