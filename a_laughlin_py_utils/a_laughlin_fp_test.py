from a_laughlin_fp import *
from fn import _
import unittest
tc = unittest.TestCase('__init__')
eq = tc.assertEqual
test_dict_k_str_v_int=dict(a=1,b=2,c=3)
test_dict_k_inttup_v_int={(1,2):1,(3,4):2,(5,6):3}
test_dict_k_int_v_inttup={1:(1,2),2:(3,4),3:(5,6)}
test_list_v_int=[1,2,3]
test_list2d_v_int=[[1,2],[3,4],[5,6]]

eq(curry2(lambda a,b:a+b)(1,2,4),3)
eq(curry3(lambda a,b,c:a+b+c)(1,2,3,4),6)
eq(curry3(lambda a,b,c:a+b+c)(1)(2)(3,4),6)
eq(curry3(lambda a,b,c:a+b+c)(1)(2)(3),6)
eq(curry3(lambda a,b,c:a+b+c)(1,2)(3,4),6)
eq(curry3(lambda a,b,c:a+b+c)(1,2)(3),6)
add2=add(2)
sub2=sub(2)
mul2=mul(2)
truediv2=truediv(2)
floordiv2=floordiv(2)
mod2=mod(2)
divisibleBy2=divisibleBy(2)

eq(add2(1),3)
eq(sub2(1),-1)
eq(mul2(1),2)
eq(truediv2(1),0.5)
eq(floordiv2(1),0)
eq(mod2(3),1)
eq(mod2(4),0)
eq(divisibleBy2(3),False)
eq(divisibleBy2(4),True)

add2vkc=lambda v,k,c:v+2
eq(mdv(add2vkc)(test_dict_k_str_v_int),{'a':3,'b':4,'c':5})
eq(mdk(lambda v,k,c:k+2)(test_dict_k_int_v_inttup),{3:(1,2),4:(3,4),5:(5,6)})
eq(ml(add2vkc)(test_dict_k_str_v_int),[3,4,5])
eq(type(mg(add2vkc)(test_list_v_int)),type((v+2 for v in [1,2,3])))
eq(tuple(mg(add2vkc)(test_list_v_int)),tuple(v+2 for v in [1,2,3]))
eq(mt(add2vkc)(test_list_v_int),(3,4,5))

eq(flatmt(lambda v,k,c:v)(test_dict_k_int_v_inttup),(1,2,3,4,5,6))
eq(flatml(lambda v,k,c:v)(test_dict_k_int_v_inttup),[1,2,3,4,5,6])

if __name__ == '__main__':
    unittest.main()
