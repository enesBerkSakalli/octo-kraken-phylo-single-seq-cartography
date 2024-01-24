import matplotlib.pyplot as plt


def linear_interpolation(a, b, t):
    return ((1 - t) * a) + (t * b)


def inverse_linear_interpolation(a, b, v):
    return (v - a) / (b - a)


def scalar_multiplication(v0: list, a: float) -> list:
    return [a * v for v in v0]


def add_vectors(v0: list, v1: list) -> list:
    return [v0[i] + v1[i] for i in range(len(v0))]


def apply_linear_interpolation(v0: list, v1: list) -> list:
    interpolated_coordinates = []
    for t in range(0, 11):
        left_side = scalar_multiplication(a, 1 - (t / 10))
        right_side = scalar_multiplication(b, t / 10)
        interpolated_coordinates.append(add_vectors(left_side, right_side))
    return interpolated_coordinates


def apply_qb_curve(v0: list, v1: list, v2: list, phi: int = 10) -> list:
    bezier_curve_points = []
    for t in range(0, phi + 1, 1):
        v01 = add_vectors(
            scalar_multiplication(v0, 1 - (t / phi)), scalar_multiplication(v1, t / phi)
        )
        v12 = add_vectors(
            scalar_multiplication(v1, 1 - (t / phi)), scalar_multiplication(v2, t / phi)
        )
        v012 = add_vectors(
            scalar_multiplication(v01, 1 - (t / phi)),
            scalar_multiplication(v12, t / phi),
        )
        bezier_curve_points.append(v012)
    return bezier_curve_points


def apply_cb_curve(v0: list, v1: list, v2: list, v3: list, phi: int = 10) -> list:
    bezier_curve_points = []

    for t in range(0, phi + 1, 1):
        v01 = add_vectors(
            scalar_multiplication(v0, 1 - (t / phi)), scalar_multiplication(v1, t / phi)
        )

        v12 = add_vectors(
            scalar_multiplication(v1, 1 - (t / phi)), scalar_multiplication(v2, t / phi)
        )

        v23 = add_vectors(
            scalar_multiplication(v2, 1 - (t / phi)), scalar_multiplication(v3, t / phi)
        )

        v012 = add_vectors(
            scalar_multiplication(v01, 1 - (t / phi)),
            scalar_multiplication(v12, t / phi),
        )

        v123 = add_vectors(
            scalar_multiplication(v12, 1 - (t / phi)),
            scalar_multiplication(v23, t / phi),
        )

        v0123 = add_vectors(
            scalar_multiplication(v012, 1 - (t / phi)),
            scalar_multiplication(v123, t / phi),
        )
        bezier_curve_points.append(v0123)

    return bezier_curve_points


def plot_2d_vectors(vectors: list):
    """
    Plots a list of 2D vectors as a scatter plot.

    Args:
    vectors (list of lists/tuples): Each sublist/tuple contains two elements [x, y].

    Example:
    plot_2d_vectors([[1, 2], [3, 4], [5, 6]])
    """
    # Extracting x and y coordinates
    x = [v[0] for v in vectors]
    y = [v[1] for v in vectors]

    # Creating the scatter plot
    plt.scatter(x, y)

    # Adding labels and title for clarity
    plt.xlabel("X-axis")
    plt.ylabel("Y-axis")
    plt.title("2D Vector Scatter Plot")

    # Displaying the plot
    plt.show()


a = [1, 1]
b = [2, 2]
c = [3, 1]

# v_ab = apply_linear_interpolation(a, b)
# print(v_ab)
# v_bc = apply_linear_interpolation(b, c)
# print(v_bc)
# for i in range(len(v_ab)):
#     interpolation = apply_linear_interpolation(v_ab[i], v_bc[i])
#     for j in range(len(interpolation)):
#         print(interpolation[j])
#     print(interpolation)
#     print("\n")
# print(points_a_b)

apply_qb_curve(a, b, c)
# plot_2d_vectors(apply_qb_curve(a, b, c, 20))
plot_2d_vectors(apply_cb_curve([-2, 0], [-1, 2], [1, 2], [2, 4], 20))
