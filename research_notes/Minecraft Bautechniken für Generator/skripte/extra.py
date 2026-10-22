import math, sys
sys.path.insert(0,'/tmp/claude-0/-home-user-minecraft-christmas-builde/32ef7291-9c0f-5f91-90ec-77b101f6b7cd/scratchpad/scripts')
from circ import grid
def disc(D,r,N=None):
    N=N or D; c=(N-1)/2
    return {(i,k) for i in range(N) for k in range(N) if (i-c)**2+(k-c)**2<=r*r}
print("== Ring t=2 as filled(D) - filled(D-4) (gleicher Mittelpunkt)")
for D in (11,15,21):
    outer=grid(D,'filled'); inner={(i+2,j+2) for (i,j) in grid(D-4,'filled')}
    ring=outer-inner
    # min radial thickness check along each row/col
    print(D,'ring blocks',len(ring))
    for j in range(D): print(''.join('#' if (i,j) in ring else '.' for i in range(D)))
    break
print("== Kegel-Lagen (Durchmesser je Lage), r_i = D/2*(1-i/(H-1))")
for D,H in ((7,7),(9,9),(9,14),(11,11),(11,22),(15,15),(9+2,9),(13,13)):
    R=D/2; ws=[]
    for i in range(H):
        r=max(R*(1-i/(H-1)), 0.5 if D%2 else 0.7072)
        L=disc(D,r); xs=[a for a,b in L]; ws.append(max(xs)-min(xs)+1)
    print(f"D={D} H={H}: {ws}")
print("== Zinnen auf Ring: Winkel-sortiert, Index-Parität")
for D in (7,9,11,13,15,21):
    g=grid(D,'thin'); c=(D-1)/2
    pts=sorted(g,key=lambda p: math.atan2(c-p[1], p[0]-c))
    # start at east axis point
    n=len(pts)
    pat={p:(idx%2==0) for idx,p in enumerate(pts)}
    # check mirror symmetry across x axis
    sym=all(pat[(i,j)]==pat[(i,D-1-j)] for (i,j) in g)
    print(D,'ring',n,'n/4',n/4,'mirror-sym(N-S)',sym)
    if D in (11,15):
        for j in range(D): print(''.join(('M' if pat[(i,j)] else 'o') if (i,j) in g else '.' for i in range(D)))
