
var XML3D = XML3D || {};
var Xflow = Xflow || {};

(function() {


function asmModule(stdlib, foreign, heap) {
    "use asm";

    // Variable Declarations
    var sqrt = stdlib.Math.sqrt;
	var imul = stdlib.Math.imul;
	var fround = stdlib.Math.fround
	
	var H_U8 = new stdlib.Uint8Array(heap);
	var H_U32 = new stdlib.Uint32Array(heap);
	
	var width = 0;
	var height = 0;
	
	var volX = 0.0;
	var volY = 0.0;
	var mX = 0.0;
	var mY = 0.0;
	
	var p_sumY = 0;
	var p_hitYArray = 0;
	
    // Function Declarations
	
	function setup(w, h)
	{
		w = w|0;
		h = h|0;

		var stride = 0;

		width = w;
		height = h;

		stride = imul(4*4, width);

		p_sumY = imul(stride, height);
		p_hitYArray = (p_sumY + width)|0;

		volX = 0.5 * +(~~imul(width, (width+1)));
		volY = 0.5 * +(~~imul(height, (height+1)));
	}
	
	function checkSize(w, h)
	{
		// uint32_t* src,
		w = w|0;
		h = h|0;
		
		if ((width >>> 0) < (w >>> 0))
			return 1;
			
		if ((height >>> 0) < (h >>> 0))
			return 1;
		
		width = w;
		height = h;

		return 0;
	}
	
	function heap_write_u32(idx, val) {
		idx = idx|0;
		val = val|0;
		H_U32[idx >> 2] = val;
	}

	function heap_read_u32(idx) {
		idx = idx|0;
		return H_U32[idx >> 2]|0;
	}

	function computeMoment()
	{
		// uint32_t* src,
		
		// local variables
		var sumX = 0;
		// sumY[width], hitYArray[width];
		var hitX = 0;
		var hitY = 0;
		
		var avgX = 0.0;
		var avgY = 0.0;
		
		var i = 0;
		var iLen = 0;
		var j = 0;
		var jLen = 0;
		
		var addr = 0;
		var t = 0;
		
        // for (int i = 0; i < width; i++)
            // sumY[i]=0;
		i = p_sumY;
		iLen = (p_sumY + ((width|0) << 2)) >>> 0;
		while (1) {
			// for-loop body
			// H_U32[i >> 2] = 0;
			heap_write_u32(i, 0);
			
			i = (i + 4)|0;
			if (i >>> 0 == iLen >>> 0) break;
		}

        // for (int i = 0; i < width; i++)
            // hitYArray[i]=0;
		i = p_hitYArray;
		iLen = (p_hitYArray + ((width|0) << 2)) >>> 0;
		while (1) {
			// for-loop body
			// H_U32[i >> 2] = 0;
			heap_write_u32(i, 0);
			
			i = (i + 4)|0;
			if (i >>> 0 == iLen >>> 0) break;
		}
		

		
		// for (j = 0; j < height; j++)
		// {
		j = 0;
		jLen = height;
		while (1) {
		
			hitX = 0;
			sumX = 0;
			
			// for (i = 0; i < width; i++)
			// {
			i = 0;
			iLen = width;
			while (1) {
						
				// const Color& cc = *(Color*)&src[i+j*width];
				if (1) // Detect(cc))
				{
					sumX = sumX+i|0;
					hitX = hitX+1|0;
					
					// sumY[i]+=j;
					addr = p_sumY + ((4*i)|0) | 0;
					t = heap_read_u32(addr)|0;
					t = t + j | 0;
					heap_write_u32(addr, t);
					
					//hitYArray[i]++;
					addr = p_hitYArray + ((4*i)|0) | 0;
					t = heap_read_u32(addr)|0;
					t = t + 1 | 0;
					heap_write_u32(addr, t);
				}
			
			// }
				i = (i + 1)|0;
				if (i >>> 0 == iLen >>> 0) break;
			}
			
			
			if (hitX)
			{
				// avgX+=((float)sumX)/(float)(hitX*width);
				avgX = avgX + +(+~~sumX / +imul(hitX,width));
				
				// hitY++;
				hitY = (hitY + 1)|0;
			}
		
		// }
			j = (j + 1)|0;
			if (j >>> 0 == jLen >>> 0) break;
		}
		
		
		if (hitY)
			// avgX/=(float)(hitY);
			avgX = avgX / +~~hitY;

		hitX = 0;
		
		// for (int i = 0; i < width; i++)
		// {
		i = 0;
		iLen = width;
		while (1) {
			// if (hitYArray[i])
			addr = p_hitYArray + ((4*i)|0) | 0;
			t = heap_read_u32(addr)|0;
			if (t)
			{
				// avgY+=((float)sumY[i])/(float)(hitYArray[i]*height);
				addr = p_sumY + ((4*i)|0) | 0;
				avgY = avgY + +(+(heap_read_u32(addr)|0) / +imul(t,height));

				// hitX++;
				hitX = (hitX + 1)|0;
			}

		// }
			i = (i + 1)|0;
			if (i >>> 0 == iLen >>> 0) break;
		}

		if (hitX)
			avgY = avgY / +~~hitX;
			
		// DEBUG:
		// avgX = 0.75;
		// avgY = 0.25;
	
		mX = avgX - 0.5;
		mY = 0.5 - avgY;
		if (mX > 0.5) mX = 0.5;
		if (mY < -0.5) mY = -0.5;
	}
	
	
	function get_mX() { return +mX; }
	function get_mY() { return +mY; }

    return {
		mX: get_mX,
		mY: get_mY,
		
		setup: setup,
		checkSize: checkSize,
		computeMoment: computeMoment
	};
}

var mod = null;


function npot(n) {
	// TODO: return next power of two
	return 0x800000;
}

function setupModule(width, height)
{
	// input image RGBA float32 -> 32bit*4channels*pixels
	// sumY[width] uint32 -> 32bit*width
	// hitYArray[width] uint32 -> 32bit*width
	var nBytes = 4*4*width*height + 4*width + 4*width;

	var buf = new ArrayBuffer(npot(nBytes));
	
	mod = {
		heap: buf,
		asm: asmModule(window, null, buf)
	};
	
	mod.asm.setup(width, height);
}


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
		
		if (mod === null)
			setupModule(width, height)

		// var d = mod.asm.diag(20.0, 100.0);
		// console.log(d+d);
		
		if (mod.asm.checkSize(width, height)) {
			console.log("Heap resize required! Reload module.");
			setupModule(width, height)
		}
		
		mod.asm.computeMoment();
		
		mX = mod.asm.mX(); // 0.25;
		mY = mod.asm.mY(); // 0.25;

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