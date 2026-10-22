import math
def disc(D, r):
    c=(D-1)/2
    return {(i,k) for i in range(D) for k in range(D) if (i-c)**2+(k-c)**2 <= r*r}
def ring4(S):
    return {(i,k) for (i,k) in S if not all(p in S for p in [(i+1,k),(i-1,k),(i,k+1),(i,k-1)])}
def cone(D,H,variant):
    R=D/2; layers=[]
    for i in range(H):
        if variant=='a': r=R*(1-i/H)
        elif variant=='b': r=R*(H-i)/H if i<H-1 else 0.5
        elif variant=='c': r=R*(1-(i)/(H-1)) if H>1 else R
        elif variant=='d': r=(R)*(1-(i+0.5)/H)+0.5
        r=max(r, 0.5 if D%2 else 1/math.sqrt(2)+1e-9)
        layers.append(disc(D,r))
    filled=sum(len(L) for L in layers)
    hollow=0
    for idx,L in enumerate(layers):
        above=layers[idx+1] if idx+1<len(layers) else set()
        shell=ring4(L) | (L - above) if idx+1<len(layers) else L
        # only cells not covered above OR on ring
        hollow+=len(shell)
    return filled,hollow,[max(i for i,k in L)-min(i for i,k in L)+1 for L in layers]
for v in 'abcd':
    f,h,w=cone(15,15,v); print(v,'filled',f,'hollow',h,w)
def ring8(S):
    return {(i,k) for (i,k) in S if not all((i+a,k+b) in S for a in (-1,0,1) for b in (-1,0,1))}
def hollow_variants(D,H):
    R=D/2; layers=[]
    for i in range(H):
        r=R*(1-i/(H-1)); r=max(r,0.5 if D%2 else 0.7072)
        layers.append(disc(D,r))
    res={}
    for name,rf in (('ring4',ring4),('ring8',ring8)):
        tot=0
        for idx,L in enumerate(layers):
            above=layers[idx+1] if idx+1<len(layers) else set()
            # cells visible from above (not covered by layer above's footprint) -> need to keep for sealing
            vis = L - above
            # ring4 of L plus cells of L adjacent(4) to a cell outside 'above' region? try: L cells whose 4-nbr is outside above
            s = rf(L) | {p for p in L if p not in above and any(q in above for q in [(p[0]+1,p[1]),(p[0]-1,p[1]),(p[0],p[1]+1),(p[0],p[1]-1)])} if above else L
            tot+=len(s)
        res[name]=tot
        tot2=sum(len(rf(L)|(L-(layers[i+1] if i+1<len(layers) else set()))) if i+1<len(layers) else len(L) for i,L in enumerate(layers))
        res[name+'_vis']=tot2
    return res
print(hollow_variants(15,15))
