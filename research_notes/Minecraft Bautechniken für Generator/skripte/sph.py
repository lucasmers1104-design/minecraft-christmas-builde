import math, itertools
def inside(x,y,z,R): return x*x+y*y+z*z<=R*R
def sphere(D):
    R=D/2; c=(D-1)/2
    S=set()
    for i,j,k in itertools.product(range(D),repeat=3):
        if inside(i-c,j-c,k-c,R): S.add((i,j,k))
    return S
N6=[(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]
N26=[d for d in itertools.product((-1,0,1),repeat=3) if d!=(0,0,0)]
N18=[d for d in N26 if sum(abs(v) for v in d)<=2]
def shell(S,N): return {p for p in S if not all((p[0]+a,p[1]+b,p[2]+c) in S for a,b,c in N)}
ref={5:(54,81,33),7:(98,179,57),9:(186,389,105),15:(530,1791,285),21:(1082,4945,569)}
for D in (5,7,9,15,21):
    S=sphere(D)
    h6=shell(S,N6); h18=shell(S,N18); h26=shell(S,N26)
    top=[p for p in h6 if p[1]>=(D-1)/2-0.01]
    print(D,'solid',len(S),'h6',len(h6),'h18',len(h18),'h26',len(h26),'dome6',len(top),'ref',ref[D])
print()
# per-layer diameter of a solid sphere layer (row widths) for dome
for D in range(5,32,2) :
    S=sphere(D); c=(D-1)/2
    layers=[]
    for j in range(D-1,int(c)-1,-1):
        cells=[(i,k) for (i,jj,k) in S if jj==j]
        if not cells: continue
        w=max(i for i,k in cells)-min(i for i,k in cells)+1
        layers.append(w)
    print('D',D,'layer diameters from equator up:', layers[::-1])
for D in range(6,22,2):
    S=sphere(D); c=(D-1)/2
    layers=[]
    for j in range(D-1,int(D/2)-1,-1):
        cells=[(i,k) for (i,jj,k) in S if jj==j]
        w=max(i for i,k in cells)-min(i for i,k in cells)+1
        layers.append(w)
    print('D',D,'layer diameters from equator up:', layers[::-1])
