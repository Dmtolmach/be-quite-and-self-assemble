# Machado 2009 full-severity CVD simulation; grid: original | protan | deutan | tritan
import sys, numpy as np
from PIL import Image
M={'protan':np.array([[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]]),
   'deutan':np.array([[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]]),
   'tritan':np.array([[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]])}
def lin(c): c=c/255.0; return np.where(c<=0.04045,c/12.92,((c+0.055)/1.055)**2.4)
def srgb(c): c=np.clip(c,0,1); return (np.where(c<=0.0031308,c*12.92,1.055*c**(1/2.4)-0.055)*255).astype(np.uint8)
for f in sys.argv[1:]:
    im=Image.open(f).convert('RGB'); im.thumbnail((520,520)); a=lin(np.asarray(im).astype(float))
    outs=[np.asarray(im)]+[srgb(a@M[k].T) for k in ['protan','deutan','tritan']]
    Image.fromarray(np.concatenate(outs,axis=1)).save(f.replace('.png','_cvd.png'))
