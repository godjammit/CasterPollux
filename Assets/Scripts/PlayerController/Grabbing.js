#pragma strict

var holding:GameObject = null;
var grabDistance:float = 1.0;
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
         
         
         
    //Where held object will appear
    if(holding != null)
    {  
    	if(! holding.networkView.isMine)
    		holding = null;
		else {
		    holding.transform.position = Vector3(playerPos.x, playerPos.y + (this.collider.bounds.size.y)/2 + (holding.collider.bounds.size.y)/2, playerPos.z);
		   	holding.transform.rotation = new Quaternion(0,0,0,0);
		}
   	}
   	//Pickup / Drop Grabbable Object
   	if(Input.GetKeyDown("g") && holding == null)
   	{
   		pickup();
   	}
   	else if(Input.GetKeyDown("g") && holding != null)
   	{
   		drop();
   	}
}

function pickup() 
{
	holding = FindClosestGrabbableObject();
	if (holding != null) 
	{
		holding.networkView.RPC("grab", RPCMode.AllBuffered, true);
		holding.networkView.RPC("changeOwner", RPCMode.AllBuffered, Network.AllocateViewID());
	}
}


function drop() 
{
	if (holding == null)
		return;
		
	holding.networkView.RPC("grab", RPCMode.AllBuffered, false);
   	
   	holding = null;
}

 // Find the name of the closest box
function FindClosestGrabbableObject () : GameObject
{
    // Find all game objects with tag Grabbable
    var gos : GameObject[];
    gos = GameObject.FindGameObjectsWithTag("Grabbable");
    if (gos == null)
    	return null; 
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
    
    if(distanceFromPlayer < grabDistance)
    	return closest;
    else
    	return null;
}