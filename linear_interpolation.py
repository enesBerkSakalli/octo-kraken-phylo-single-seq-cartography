def linear_interpolation(a, b, t):
    return ((1 - t) * a) + (t * b)


def inverse_linear_interpolation(a, b, v):
    return (v - a) / (b - a)

for i in range(0, 10):
    print(linear_interpolation(1, 10, i / 10))
    print(inverse_linear_interpolation(1, 10, i / 10)) 
