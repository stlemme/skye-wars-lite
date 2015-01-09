
var XML3D = XML3D || {};
var Xflow = Xflow || {};

(function() {


function rgbToHsl(r, g, b) {
    r /= 255.0, g /= 255.0, b /= 255.0;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

function Detect(src, idx, hue, threshold)
{
	var r = src[4*idx], g = src[4*idx+1], b = src[4*idx+2];
	var d = 8;
	// return (r > 252 && g > 252 && b > 252);
	return (r < d && g < d && b < d);

	// var hslP = rgbToHsl(r, g, b);
	// return Math.abs(hslP[0] - hue) < threshold;
	
	// return (Math.abs(r - c[0]) < 4) && (Math.abs(g - c[0]) < 4) && (Math.abs(b - c[0]) < 4);
	
	//float i = c.r - 0.5f * (c.g + c.b);
	//return (i > 0.6f);
};

var cache = function () {
	this.width = null;
	this.sumY = null;
	this.hitYArray = null;
	
	this.resize = function(width) {
		if (width == this.width)
			return;
			
		this.sumY = new Uint32Array(width);
		this.hitYArray = new Uint32Array(width);
	}
	
	this.getSumY = function (width) {
		this.resize(width);
		return this.sumY;
	}

	this.getHitYArray = function (width) {
		this.resize(width);
		return this.hitYArray;
	}
};

var globalCache = new cache();



var Kalman = function () {
	this.A = $M([
		[1, 0, 0.2, 0],
		[0, 1, 0, 0.2],
		[0, 0, 1, 0],
		[0, 0, 0, 1]
	]);
	
	this.B = $M([
		[1, 0, 0, 0],
		[0, 1, 0, 0],
		[0, 0, 1, 0],
		[0, 0, 0, 1]
	]);

	this.H = $M([
		[1, 0, 0, 0],
		[0, 1, 0, 0],
		[0, 0, 1, 0],
		[0, 0, 0, 1]
	]);

	this.Q = $M([
		[0.001, 0, 0, 0],
		[0, 0.001, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0]
	]);

	this.R = $M([
		[0.1, 0, 0, 0],
		[0, 0.1, 0, 0],
		[0, 0, 0.1, 0],
		[0, 0, 0, 0.1]
	]);

	this.last_x = $V([0, 0, 0, 0]);
	
	this.last_P = $M([
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 0]
	]);
};

Kalman.prototype.filter = function(cur_xPos, cur_yPos)
{
	// console.log(this);
	/*** KALMAN FILTER CODE ***/
	var velX = cur_xPos - this.last_x.elements[0];
	var velY = cur_yPos - this.last_x.elements[1];

	var measurement = $V([cur_xPos, cur_yPos, velX, velY]);
	var control = $V([0, 0, 0, 0]); // TODO - adjust

	// prediction
	var x = (this.A.multiply(this.last_x)).add(this.B.multiply(control));
	var P = ((this.A.multiply(this.last_P)).multiply(this.A.transpose())).add(this.Q); 

	// correction
	var S = ((this.H.multiply(P)).multiply(this.H.transpose())).add(this.R);
	var K = (P.multiply(this.H.transpose())).multiply(S.inverse());
	var y = measurement.subtract(this.H.multiply(x));

	var cur_x = x.add(K.multiply(y));
	var cur_P = ((Matrix.I(4)).subtract(K.multiply(this.H))).multiply(P);

	this.last_x = cur_x;
	this.last_P = cur_P;
	
	return cur_x;
};


var filter = new Kalman();

Xflow.registerOperator("xflar.fft", {
    outputs: [
        {type: 'float4x4', name : 'transform', customAlloc: true},
        {type: 'bool', name: 'visibility', customAlloc: true},
        {type: 'float4x4', name : 'perspective', customAlloc: true}
    ],
    params:  [
        {type: 'texture', source : 'arvideo'},
        {type: 'float3', source : 'detect'}
    ],
    alloc: function(sizes, arvideo, detect) {
        sizes['transform'] = 1;
        sizes['visibility'] = 1;
        sizes['perspective'] = 1;
    },
    evaluate: function(transform, visibility, perspective, arvideo, detect) {

        var width = arvideo.width, height = arvideo.height;
        
        var src = arvideo.data;

        // void ComputeMoment(uint32_t* src, uint32_t width, uint32_t height)
		// uint32_t sumX=0, sumY[width], hitYArray[width];
		var sumX = 0;
		var sumY = globalCache.getSumY(width);
		var hitYArray = globalCache.getHitYArray(width);

		// uint32_t hitX=0, hitY=0;
		var hitX = 0, hitY = 0;
		// float volX=(float)(width*(width+1))/2.0f;
		var volX = 0.5 * (width*(width+1));
		// float volY=(float)(height*(height+1))/2.0f;
		var volY = 0.5 * (height*(height+1));
		
		var avgX = 0.0;
		var avgY = 0.0;
		
		var blimpColor = [86, 143, 67];
		var blimp = rgbToHsl(blimpColor[0], blimpColor[1], blimpColor[2]);
		var threshold = 0.01;

		var i, j;
		
		for (i = 0; i < width; i++)
		{
			sumY[i] = 0;
			hitYArray[i] = 0;
		}
		
		for (j = 0; j < height; j++)
		{
			hitX = 0;
			sumX = 0;
			for (i = 0; i < width; i++)
			{
				// const Color& cc = *(Color*)&src[i+j*width];
				if (Detect(src, i+j*width, blimp[0], threshold))
				{
					sumX += i; hitX++;
					sumY[i] += j; hitYArray[i]++;
				}
			}
			if (hitX > 0)
			{
				// avgX += ((float)sumX) / (float)(hitX*width);
				var r = (sumX+0.0) / (hitX*width);
				avgX += r;
				hitY++;
			}
		}
		if (hitY > 0) {
			// avgX /= (float)(hitY);
			avgX /= (hitY+0.0);
		}

		hitX = 0;
		for (i = 0; i < width; i++)
		{
			if (hitYArray[i] > 0)
			{
				// avgY += ((float)sumY[i]) / (float)(hitYArray[i]*height);
				avgY += (sumY[i]+0.0) / (hitYArray[i]*height);
				hitX++;
			}
		}
		if (hitX > 0) {
			// avgY /= (float)(hitX);
			avgY /= (hitX+0.0);
		}
	
		mX = avgX - 0.5;
		mY = 0.5 - avgY;
		if (mX >  0.5) mX =  0.5;
		if (mY < -0.5) mY = -0.5;
		
		//mX = 0.25;
		//mY = -0.25;

		// console.log([mX, mY]);
		
		//var result = filter.filter(mX, mY);
		// console.log(result.elements);
		//mX = result.elements[0];
		//mY = result.elements[1];

		var volSize = [16.0, 12.0, 16.0];

        transform[ 0] =  1.0;  transform[ 4] =  0.0;  transform[ 8] =  0.0;  transform[12] =   mX*volSize[0];
        transform[ 1] =  0.0;  transform[ 5] =  1.0;  transform[ 9] =  0.0;  transform[13] =   mY*volSize[1];
        transform[ 2] =  0.0;  transform[ 6] =  0.0;  transform[10] =  1.0;  transform[14] =   -volSize[2];
        transform[ 3] =  0.0;  transform[ 7] =  0.0;  transform[11] =  0.0;  transform[15] =   1.0;

        // perspective:
		var p = [1.91013443470001220, 2.5404789447784424, -1.00133419036865230, -1.0,  -0.20013342797756195];
        perspective[ 0] = p[0]; perspective[ 4] =  0.0; perspective[ 8] =  0.0; perspective[12] =  0.0;
        perspective[ 1] =  0.0; perspective[ 5] = p[1]; perspective[ 9] =  0.0; perspective[13] =  0.0;
        perspective[ 2] =  0.0; perspective[ 6] =  0.0; perspective[10] = p[2]; perspective[14] = p[4];
        perspective[ 3] =  0.0; perspective[ 7] =  0.0; perspective[11] = p[3]; perspective[15] =  0.0;

        visibility[0] = true;

    }
});


})();