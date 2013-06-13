#pragma strict

var xspeed : float = 5;

function Start () 
{
}//end method


function Update () 
{
		var xaccel : float = 0;
		var xvel : float = 0;
		
		if (Input.GetKey(KeyCode.LeftArrow))
			xaccel -= xspeed;
		if (Input.GetKey(KeyCode.RightArrow))
			xaccel += xspeed; 
		
		//if (! (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.LeftArrow))) 
		//	xaccel = - xvel * 0.1;
		
		//calculate velocity
		xvel = xaccel * 30 * Time.deltaTime;
		 
		//apply vel
		var speed : Vector3 = Vector3 (xvel, 0, 0);
		this.GetComponent(Follow).target.rigidbody.AddForce(speed * Time.deltaTime, ForceMode.Impulse);
}//end method