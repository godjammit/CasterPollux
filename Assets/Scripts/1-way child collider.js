function OnTriggerEnter (jumper: Collider) {
    //make the parent platform ignore the jumper
    var platform = transform.parent;
    Physics.IgnoreCollision(jumper.collider, platform.GetComponent(BoxCollider));
}
 
function OnTriggerExit (jumper: Collider) {
    //reset jumper's layer to something that the platform collides with
    //just in case we wanted to jump throgh this one
    jumper.gameObject.layer = 0;
   
    //re-enable collision between jumper and parent platform, so we can stand on top again
    var platform = transform.parent;
    Physics.IgnoreCollision(jumper.collider, platform.GetComponent(BoxCollider), false);
}