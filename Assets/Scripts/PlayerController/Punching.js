#pragma strict

var punchPower:float = 400.0;
var punchRange:float = 1.0;
private var rightFacing:boolean = true;

function Update ()
{
	//Gets the latest faceing of the character
    if (Input.GetAxisRaw("Horizontal") < 0) 
    {
		rightFacing = false;
    }
    else if (Input.GetAxisRaw("Horizontal") > 0) 
    {
    	rightFacing = true;
    }
    
    var playerPos:Vector3 = transform.position;
    
    var objectToPunch:GameObject = null;
    
   	//Punch Punchable Object
   	if(Input.GetKeyDown("p") && rightFacing)
   	{
   		objectToPunch = FindClosestPunchableObject();
   		if(objectToPunch != null)
   			objectToPunch.rigidbody.AddForce(Vector3(punchPower,0,0));
   	}
   	else if(Input.GetKeyDown("p") && !rightFacing)
   	{
   		objectToPunch = FindClosestPunchableObject();
   		if(objectToPunch != null)
   			objectToPunch.rigidbody.AddForce(Vector3(-punchPower,0,0));
   	}
}

 // Find the name of the closest box
function FindClosestPunchableObject () : GameObject
{
    // Find all game objects with tag Punchable
    var gos : GameObject[];
    gos = GameObject.FindGameObjectsWithTag("Grabbable"); 
    var closest : GameObject = null; 
    var distance = Mathf.Infinity; 
    var position = transform.position; 
    
    // Iterate through them and find the closest one
    for (var go : GameObject in gos)
    { 
        var diff = (go.transform.position - position);
        var curDistance = diff.sqrMagnitude; 
        if (curDistance < distance)
        { 
            closest = go; 
            distance = curDistance; 
        } 
    }
    
    var distanceFromPlayer:float = Mathf.Infinity;
    if(rightFacing)
    	distanceFromPlayer = Vector3.Distance(closest.transform.position,(transform.position + Vector3(1,0,0)));
    else
    	distanceFromPlayer = Vector3.Distance(closest.transform.position,(transform.position - Vector3(1,0,0)));
    
    if(distanceFromPlayer < punchRange)
    	return closest;
    else
    	return null;
}