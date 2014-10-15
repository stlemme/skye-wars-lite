
var XML3D = XML3D || {};
	
(function() {

XML3D.animation = XML3D.animation || {};

XML3D.animation.animators = Array();

var Animator = function() {
	this.lastTime = new Date().getTime();
	this.anims = Array();
	this.global = 0.0;
	
	XML3D.animation.animators.push(this);
};

Animator.prototype.animloop = function (delta) {
	var global = this.global + delta;
	this.global = global;
	this.anims.forEach (function (anim) {
		anim.animate(delta, global);
	});
};

Animator.prototype.registerAnimation = function (anim) {
	this.anims.push(anim);
};

Animator.prototype.removeAnimation = function (anim) {
	var idx = this.anims.indexOf(anim);
	this.anims.splice(idx, 1);
};

XML3D.animation.Animator = Animator;


(XML3D.animation.loop = function (time) {
	// var t = new Date().getTime();
	var delta = (time - this.lastTime) / 1000;
	// var delta = time / 1000;
	this.lastTime = time;
	window.requestAnimationFrame(XML3D.animation.loop);
	// console.log(delta);
	XML3D.animation.animators.forEach (function (anim) {
		anim.animloop(delta);
	});
})();


var GlobalTimeElement = function( elem ) {
	this.elem = elem;
}

GlobalTimeElement.prototype.animate = function(delta, global) {
	this.elem.setScriptValue([global]);
}

XML3D.animation.GlobalTimeElement = GlobalTimeElement;


var TweenElement = function( elem, tween ) {
	this.elem = elem;
	this.tween = tween;
}

TweenElement.prototype.animate = function(delta, global) {
	// console.log("TweenElement.animate");
	this.tween.update(1000*global);
}

XML3D.animation.TweenElement = TweenElement;


})();