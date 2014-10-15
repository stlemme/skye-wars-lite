
var XML3D = XML3D || {};

(function() {


function targetDirection(target) {
	var from = XML3D.math.vec3.fromValues(1.0, 0.0, 0.0);
	var to = XML3D.math.vec3.fromValues(target.x, target.y, target.z);
	XML3D.math.vec3.normalize(to, to);
	
	// TODO: ensure y-axis stays up
	
	return XML3D.math.quat.rotationTo(
		XML3D.math.quat.create(),
		from, to
	);
};

function startPosition (obj) {
	obj.x = 0.0;
	obj.y = 0.0;
	obj.z = -1.0;
	return obj;
}

function createTween( transform, model, tripTarget, tripTime, delayTime ) {
	var tween = new TWEEN.Tween( startPosition({
		tf: transform,
		m: model
	}) );
	
	var target = tripTarget.call();
	tween.to(target, 1000*tripTime);
	tween.onUpdate(function() {
		this.tf.translation.set(this.x, this.y, this.z);
		this.m.visible = true;
		//this.tf.scale.set(0.5, 0.5, 0.5);
	});
	
	var reset = function() {
		startPosition(this);
		var target = tripTarget.call();
		// console.log(target);
		var q = targetDirection(target);
		this.tf.rotation.set(q);
		this.m.visible = false;
		tween.to(target, 1000*tripTime);
		tween.start(1000*animator.global);
	};
	
	tween.onStart(reset);
	tween.onComplete(reset);
	tween.easing(TWEEN.Easing.Quadratic.Out);
	tween.delay(1000*delayTime);
	tween.start(1000*animator.global);
	return tween;
}

var id_gen = 0;

XML3D.spawnSpaceship = function( tripTarget, tripTime, tripDelay ) {
	var ships = document.getElementById("ships");
	
	var ship_id = id_gen++;
	
	var start = startPosition({});
	
	var t = XML3D.createElement("transform");
	t.setAttribute("id", "ship_tf" + ship_id);
	t.setAttribute("scale", "0.5 0.5 0.5");
	t.setAttribute("translation", start.x + " " + start.y + " " + start.z);
	ships.appendChild(t);
	
	var m = XML3D.createElement("model");
	m.setAttribute("src", "assets/spaceship.xml#asset");
	m.setAttribute("transform", "#ship_tf" + ship_id);
	
	var tween = createTween(t, m, tripTarget, tripTime, tripDelay);
	var tweenElem = new XML3D.animation.TweenElement(t, tween);
	animator.registerAnimation(tweenElem);
	
	ships.appendChild(m);
}


})();