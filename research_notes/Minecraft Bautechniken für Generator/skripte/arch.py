import math
# open(x,y): True if point is inside opening (air). x in [0,W], y>=0 above springing line.
def round_open(W):
    r=W/2; c=W/2
    return lambda x,y: (x-c)**2+y**2 <= r*r, math.ceil(r)+1
def gothic_open(W):
    return lambda x,y: x**2+y**2<=W*W and (x-W)**2+y**2<=W*W, math.ceil(W*math.sqrt(3)/2)+1
def seg_open(W,h):
    r=(W*W/4+h*h)/(2*h); cy=h-r; c=W/2
    return lambda x,y: (x-c)**2+(y-cy)**2<=r*r, math.ceil(h)+1
def classify(op,i,j):
    q={}
    for nm,(dx,dy) in {'LL':(.25,.25),'LR':(.75,.25),'UL':(.25,.75),'UR':(.75,.75)}.items():
        q[nm]=not op(i+dx,j+dy)   # solid?
    s={k for k,v in q.items() if v}
    if len(s)==4: return '##'
    if len(s)==0: return '..'
    if s=={'UL','UR'}: return 'Ts'   # slab type=top
    if s=={'LL','LR'}: return 'Bs'
    if len(s)==3:
        miss=({'LL','LR','UL','UR'}-s).pop()
        return {'LR':'tW','LL':'tE','UR':'bW','UL':'bE'}[miss]  # t=half top, b=half bottom, letter=facing
    return '?'+str(len(s))
def blockonly(op,i,j): return '..' if op(i+.5,j+.5) else '##'
def show(name,W,op,H):
    print(f"--- {name} W={W} (Zeilen von oben nach unten; links Pfeiler x=-1, rechts x=W)")
    for j in range(H,-1,-1):
        row=['##']+[classify(op,i,j) for i in range(W)]+['##']
        row2=['#']+[blockonly(op,i,j)[0] for i in range(W)]+['#']
        print(f"y={j}  "+' '.join(row)+"    nurBlöcke: "+''.join(row2))
for W in (3,5,7,9,11):
    op,H=round_open(W); show('Rundbogen',W,op,H)
for W in (3,5,7,9):
    op,H=gothic_open(W); show('Spitzbogen(gleichseitig)',W,op,H)
for W,h in ((5,1.5),(7,2),(9,2.5)):
    op,H=seg_open(W,h); show(f'Segmentbogen Stich={h}',W,op,H)
