import React, { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";

const DEFAULT_BACKEND_URL = "https://express-backend-myapp.onrender.com";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5000"
    : DEFAULT_BACKEND_URL)
).replace(/\/$/, "");

const PUBLIC_USER_ID = 7;

const DEVICE_ID_KEY = `notes_management_device_id_${PUBLIC_USER_ID}`;
const SELECTED_CHANNEL_PIN_KEY = "selected_channel_pin";
const SELECTED_CHANNEL_TRUST_KEY = "selected_channel_trusted_device";
const SELECTED_CHANNEL_SKIP_VERIFY_KEY = "selected_channel_skip_pin_verify";
const SELECTED_CHANNEL_DEVICE_KEY = "selected_channel_device_id";
const SELECTED_CHANNEL_VERIFIED_AT_KEY = "selected_channel_verified_at";
const TRUSTED_PIN_PREFIX = `trusted_private_channel_pin_${PUBLIC_USER_ID}_`;
const SESSION_VERIFIED_PREFIX = `verified_private_channel_session_${PUBLIC_USER_ID}_`;
const REALTIME_REFRESH_MS = 2500;

const deviceCardThemes = [
  ["#ecfeff", "#dbeafe", "#2563eb"],
  ["#f5f3ff", "#ede9fe", "#7c3aed"],
  ["#f0fdf4", "#dcfce7", "#16a34a"],
  ["#fff7ed", "#ffedd5", "#ea580c"],
  ["#fdf2f8", "#fce7f3", "#be123c"],
  ["#f0fdfa", "#ccfbf1", "#0f766e"],
  ["#eef2ff", "#e0e7ff", "#4f46e5"],
  ["#fefce8", "#fef3c7", "#b45309"],
];

const dateBadgeThemes = [
  ["#0f766e", "#14b8a6"],
  ["#2563eb", "#38bdf8"],
  ["#7c3aed", "#c084fc"],
  ["#be123c", "#fb7185"],
  ["#b45309", "#f59e0b"],
  ["#047857", "#34d399"],
  ["#4338ca", "#818cf8"],
  ["#c2410c", "#fb923c"],
];

const ATTACH_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAZCAYAAAA14t7uAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFBSURBVEhL7ZXRjcMgDIb/3jsreAFYIQuwQhcoI3QBughdJOki9iL/PVyDUkKb9HT31k+KItnwScHYOZAkdpJSgpkBAEQE5/MZItIuAwB8tYEeZoYQAq7XaxVN04QQAqZpapf/wB3EGOm95ziO3biqPsRJclOsqnTOsZTSpl7mNo9i/tRhGNoURAQigtvt1qb6Z2xmtUg9XuVmVuK5UM+KcrlckFJqwytW4i3MDKrahle8Ld7LR1xZidveX7bw8j1jZqs96Ilxl82XfhgGiAhSSgghwMxwPB6BxX3uibstnXOmc67OAFVlzpmn0+lhXrTrlnTFJOm9fzpgSLKUQuccc85tinwlzjnTe1+HzDiOVFWWUhhjpHOOMcZ2W+WpmPcjmCXt05toSw7c8QeZ29jMajG32CX+Dd3r9hd8xJV/E38DUIkWAOcCAi0AAAAASUVORK5CYII=";
const COLOR_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABNCAYAAAAW92IAAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAmXSURBVHhe7Zt7bFtXHcc/516/4rzatE2faZsm7Tro0nbtKlqJbmyjwMY0YKCNSYwWsa1jEi0rGitSYSAGQ9NYmViReFQTgghRJNCE9ui6MbEKja0s7dag9UnX9LGkrZM0jh3Hvvfwx7lJ7JNr+9pOmiHnI0W2f+c+zvme3/mdZ4SUUlLGGLqh3JgUQDeUG5MC6IZyY1IA3VBuTAqgG8qNSQF0Q7kxKYBuKDfKXgAxcdPhoddK52u+bAgQzufQ7zFgYgSQKUichYGTEHsPom0QPwEDHZC6DHYMRADMEJiVEJwDwUaoaIKqFgjOh1Aj+Gr0JxfMFRRAghWH7r1w5mmIHwMrCjLpeIF0vCA9O2m1LVAtVphghMCsgboNMO9bEFoAwleUV4y/ANKCwU7o/D1c+BPEjioPwNavLBxhKk+ZcgPU3wnTbgWzqiAhxlEACfYARPbC0Qcg1ZO30BKBJX1ctmoYkBUIbMJGjCqjD1NY+uVpCCVG9RpYsgsqmtVvD0KMkwASBrvg2FbofhHsuH6BK3G7gp9feJjne2+nMzUbn0gyP3CKe6c9w+dq92CI3AKCAP80mPtNmLcFjEBeEcZBAFu5+XsbIfpO3lofIiGDPNG5g2cv3YdEIJ2MCySmsHh8zhZur/1zHk/A8QYDZt8LjY+pIJqDsR0HSBsGTkP7HQUVHqAttpo/RDZhYwwXnuFmYfKbS98galdn3OOOVHHn/G/hyNfAiukXZDCGAkgYOA6HPw/xkwUVHqB9oIWk9OtmcER4f7CRmB3Wk7Ijk3DpRTjzpBIkC2MngJ2Ak9shdsTDoGY0SenPqHkdS/qQhWZXDsLpn0LPq8o7XSjwidmQcGYnRF7OqHnVqwvstL9s0jQFj2dt3wLJTN95QsJbMB3BaQ6nfgBWn54IYyOAhP7/qMGNHMxIidghWuPN3N+znjsjn2Rb71r2JebRL30Z1wGsq/wHKysO6GZwBLi19q/UmL16kgekGmn2vObqBaX3AtKGk9+Bc7uG25p0Cr+j7zrOWZXDNS8AE5ubgmfZHG7HJ0ZeLRFcSk3nwY7dtMVXY0kfAolfDPKVut08VP8TgsbAiA9JSA6GOLr/E5x8ay3JRIh5yw7RsuE5glVRRNqzAQg3w7UH1CgyjRIFkGoM37YOUn3DbV8iaI03syfehOXSroPCYntVG6v8FzLsEkHMDvPP/vWcSCwhIBIsCx1iRfhtAiIxcp0URC/N4PXf3U/nsaVI21QCC0n19C7Wb9pFfeMxhJFW40YQWl6GmjUjtpIFkCk49Sh0/Cyj7dsI7utdT5cVdm3zAskK/yV+WP2WnuQJK+nn77/ewulDq5FytMCh6l7uePTbhKovjxiFCYufgVkb0y8tMQZYMeh+dbjm0+m1Ay5WhUQQsYO62TOJWCVdJ5e4Fh4g0V/NmfYVmUZpq9GpRmkCpHrUrM6lqPOMfhfnVxhIGs202ikQO+UjEa3SzcNIKejvrtOtrkGweAGkDX1vqimthkByS+g0ZpbBUEhY3B0+pps9Y5g2vuBITNARQhKo0EeAQsUBjeIFwIKLz7nWvgDWBT7gpuBZgsIajtwGkrBI8dWKI9QbA/ptnvFXxKhrOAV6pHfwBweYfVV7plEYEJiWaStJAGlD3xu6dZhKkWJzuJ3tVW2s9F+kwezj+uA5dtbu51OhDlTcLg5fIMF1X2glWBlVkd4RQgiJLzjA2rt3UzvzvHaXqVaSNIrvBQY74c2r1fLVRCAFkTPzOfzKLZxtX05qMEh90xE+evPzzLmqHcPURpVGGNa0Q2B2hrl4AaLvwMGPqznARCGdxpXWGwgh3ZvGtNvgI60gMidcxTcBO+qs400gQiKERBj28J9r4YUfGh52VokyKUGAhGsA/PAhoOZjULnUtbijLV6x80RxG4hL6JXQI6FfgnWlNRNgVMCCHWC4rwwVHwO696nFD5nUU1QhD1qw34KIVGLUCFhmwI0+cF/3GHuMICz4PjRszVrX7lYvGCGnx9ewncL/JQWdEpJqyEC3VILsS0FKv2kcMIJQ/2WY+0DOYmZPyYdvKggXARJOQd0GgRL4lwUdboljiPDDvK3QvFM1gRwUL0Bglhpc6Ayi3D4bFnA+R3pJCAg2wOKnYf72UXN/N4oXwKyG0OiRFdLDeqj7ylcJCLU1VtkCLS/AzHs8FZ6SBBAG1H1at6oAV+PSNIYQwPQc6cUgfDDnQWj5m9pAdenvs1GCACbUfWb0I0JOtM9WxvkCmrIlFoOhdoEW/Rj8090Dcw6KFwAB4aVOLEh7qYHq6taZMLRhKxz7QgF3+cFfWCZzYtaogCeMggtPSeMAUHt+7V+C7ldGj3BSqGh/XqrvM5ya9w9tdY8RldfAyv2uc30vlOABqK3pabc56mv4gEZDecJ6E642IJCv8EJ1Yb5a5c6+WmfykuOm+CnXRRmvlOYBAKleOLACBj8Y7QUFIVRzWrgDqq5VvYzVB9GD8P5jkDjj/nzhg6XPwowv6imecKm6AjGrYfbXC4q8rlStUq48ayNULYeKRepz5j2w/CXl6m7ZlSmIvJBz/y8XLk8sECGg/i7wTdFTvCMCsOhHEJztZGkocjpb3aGF0PxU9q3uyN6iF2ZKFwABFY1qP16M3vLyRPUKNWXNmh0Dqleps0Bu8SDV4wTiwsn2xgIxYP4jKpNuGcxH7Q35xTNCOZ4voV9bBPXIGAmA6oYaHslfEDfcyuSKSxAcxvNDMhg7AUAdW1vw3VHrbnnped05OZYDOwF9B7KIICDUoBs9MbYCCEMdUKrbUNij+/4Nl9/IUjiUPfq2On7jdo0wnBhSOAXk0gsCzDAs/qUSwWvXKJPw3+9B7Njo7kxa0H8Yjm/Lft6nYrHrmr8XxlgAlAiBGeq8XuU1HmOChOgBaLseOlshcQ6SXWrw09UK735WHXJwnWcbMPVmj+8ZTekjwVwkL8KJbXBhj+vGZFZ8U9SJT6tPjTRzYVTCytecgVLhjK8ASOW2HU/AuV9BKqJfUBpGEJqehFmbvDc3jXEWACWCTEH0EBzdrE6H54v4XhCmGnwtetyZCRbXDV4BAYaQkOyGrj+qg9P97zpCFPp6Qx2Tb3hI9TglFJ4rK8AQNtiDEHkJOh5XXZsVVWJImSbI0GfanMCoVBOkJb+AULP7NLxAJkCANGQKBk6ps8X9B1UziR+HZEQFP+GDwFy1rTX1Rqharb7nWeouhIkVADJrXKb/Tif932WKd3c3PgQCTCylN6L/cyYF0A3lxqQAuqHcmBRAN5QbkwLohnLjfxwKZOw/FXKqAAAAAElFTkSuQmCC";

const FILE_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHoAAAB5CAYAAAD2zTVKAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAA0mSURBVHhe7Z1bTBzVH8d/Z87sLrfl0qUpSFWMjdhaKoU0UQqmMWlaCS0FTJuokTbygonVxCZU4a3xRWP0wUhao8TWxGBCTW8PlJi0aJpiEamaVImWv9ByKe5Chf8ul53z/T/8dxt2ZqFAd3cW5nyS38ucmbMz8+Fc5pwzAwMAkqx6FP0GyeqE9f75H1miLQD7r9cnRVsAJttoayDbaIsgRVsEKdoiSNEWQYq2CFK0RZCiLUJcP0cLIWh4eJh6enro8uXL1NnZSb29veR2u2lmZka/e1RJSUmhzMxMeuqpp2j79u1UXFxMW7ZsoYyMDP2u8QniEE3T4Ha7cfToUeTk5CAxMRGccyiKAsYYiMiUYIxBURSoqork5GTk5ubi008/xfT0NIQQ+suIK+JKtBACXq8Xzc3N2Lx5M1RVNdzseArGGFRVRUlJCdrb2zE7O6u/pLghbkQLITA5OYn6+nrY7XZTS+5ywuFwoKmpCTMzM/pLiwviQnRQck1NDTjnhpu4UiI1NRXHjh2D3+/XX6LpxIVor9eL+vp6KIpiuHkrKRhjSElJQWtra9y12aaL1jQNzc3NsNvthhu3EoMxhjVr1uCXX36Bpmn6yzUN00W73W5s3rx5xbXJCwVjDEVFRRgeHo6bkm2qaCEEjh49Gve96+UEYwy7d+/GxMSE/rJNwVTRg4ODyMnJMdyk1RKcczQ2NsZF58y0IVAA1NPTQx6PR5+0atA0jT766CP69ttvyewBSFNFd3R0xHwoM9Z4vV6qq6ujrq4uU2WbKrqzs9PUi48FAMjj8VBdXR0NDAyQEEK/S0wwTTQR0R9//LHqRVNgcubnn3+m119/nbxerynXbKro8fFxUy7aDIQQ1NbWRseOHSO/369Pjj763lms8Pv9K3q4c7mhqiqam5tjPphi2ny0pmnkcDhI0zR90qqGMUaZmZl0+fJl2rhxoz45aphadVsRAOR2u6myspJu3rwZs6ZLijYBIQT9+eefdOTIEfL5fDGRLUWbhKZpdObMGWpoaIjJWIIUbSJCCDpx4gSdO3cu6n0V2RmLA1JTU6mjo4OefvppfVLEkCU6DpicnKT333+fZmdn9UkRQ4oOA2OMFEUhzvm9UBSFGGP6XSOCEIJaW1vp6tWr+qSIIavuOQQFO51OKi4upry8PEpNTaWpqSnq7++na9euUV9fH+H/07sR7S0zxqioqIi+//57SkhI0Cc/OPoRlFgRbyNjTqcTZWVlOH36NKampqBpmiH8fj+6u7tRV1eH3NzciK+KSUtLw08//RSVVSmWF805x6ZNm3Dt2jV4vd77Dk0KITA7O4tbt27htddeg81mM+S53LDZbGhqarrvOSwHS4tWFAXPP/88BgYGllyKhBDw+Xw4fvw4XC5XREq3oig4cOCAFB3psNvt6Onp0Z/aPYQQ0DRtwT8CTdNw9uxZOJ3OB5bNGMOTTz4ZlaVHlu51q6pKjz/+eMg2ACSEIJ/PR93d3dTe3k7d3d3k9XpJCGHogCmKQmVlZfTee++RqqohaUsFAA0ODuo3Rwa9+VgRDyVaVVV89tln96pKIQR+++03HD58GC6XC5zze5Geno7Dhw/jxo0bYavWmZkZVFZWGn5jqaGqalRKtKVFB9+sOHjwIL766iu89dZbyMzMBOfcUA0zxsA5R05ODq5cuWKQIYRAe3v7A7+IwDk35B0JLCc6KCz4Ci4LvAprs9kW/VpuRkYG2tvbDSXb6/Vi+/bthv2XEtESbYkBE0VRKCEhgVwuF+Xn59Njjz1GHo+Hrl+/TkNDQzQxMbGk5T2MMdq2bRtdunSJEhMT720XQtDp06dp//79hrZ8sXDOaXp6mjjn+qQHQ28+VsSqRDPGsHXrVpw/fx4ejyfkHHw+H65fv4433ngDqqouqjQHI/jMq6e/vx+pqamG/Rcb0SrRq1o0Ywzl5eVwu93zPiIJIeD3+3Hq1KklCQr+Aelffh8dHcWGDRuW9EczN6ToJQbnHNXV1bh79+68kucyOzuLL774YkmdqezsbNy5cyckn7GxMWzdujXuRK/K52hVVWnPnj30ySefkNPpNMw6aZpmaENVVaWXX36Zdu3aZdh/PoQQhtUhwYmReCP+zugB4ZxTeXk5ff3115SVlRUize/3099//00nTpygs2fP0sTERIhwm81G1dXVixZls9koOTk5ZJsQgqanp0O2xQX6Ih4rolF1M8ZQXV2NoaEh/c9B0zRcuHABWVlZ9x6pampqDG3sr7/+CofDYchbH4qiYM+ePYZmYXh4GDk5OXFXda8a0Ywx7Nu3L2ybrGkaWltbkZiYGCIgKSkJt27dCtl3ZGQESUlJhvz1kZaWhitXroQcGxxZe5AZrWiJXlwdFedwzqmiooK+/PJLQ5sshKCLFy9SbW0tTU1NGdpmfXscbjxbD+ecXnnlFdq2bVvIdk3TqKWlJapLgpaN3nysiFSJVhQFhYWFYacagyU5IyPDUJVyznHw4EHD56K6uroWrLo553jxxRcxMjISchwA3L59G+vWrTMcs5SIVole8aLXrl2Lvr4+ffaYnZ3FhQsXkJCQYJCsqip27NiB8fHxkGOEEDh+/HjY82KBodMXXngB//77b9g/qo8//jjssUsJKTpMKIqCxsZGw5hzsOOVmZlpkKwoCvbu3Qu32x1yDAIzULt27TL8DgUE7N+/H//8849BMgAMDQ1hw4YNhuOWGlJ0mHA6nbhx40ZIvsFZJH3HiwIlee/evfN22JqamsJ2pIIleT7Jo6OjeO655yLynTQpOky89NJLhjZ2amoKRUVFBsmcc+zYsSPscKimaTh//jzS0tLCHlddXR22uhaB5URlZWUR+7KSFK0Lxhja2toM1fbnn39uKJU80IEaGxsL2ReBtrylpQVr166dV/Lg4GBYyR6PB5WVlQ90HfqQonWRkpKCgYGBkDw1TUNhYWGIMMYYSktL55V86dIlQ6/8fh2voOTdu3dHpLqeG1L0nGCM4aGHHsLw8HBInh6Px/DdsvT0dPT29hpkaZqGlpYWZGRkGPLnC3S8gtV1VVVVxCWTFB0ajDE8+uijhmfZO3fuIDs7O2S/hx9+2LBfsE2er7qer+MlhMDo6CjKysqWfe73CylaF1lZWYYxbZ/Ph0ceeSRkP5vNhra2tntj2kHJ6enpYSXHsuMVLqRoXSQkJODmzZsGIbW1tYZ809LS0NDQgG+++QaNjY1hF9wHJd++fduQZ7BNrqqqMuQd6ZCiw8SpU6cMve6//voL6enphn0VRQFfYHWnGR2vcCFFh4ni4mJMT08b8q2vr1903pxzHDhwIGybjEBzUFlZGRPJJEWHD7vdjh9++EGfNcbGxrBv3z7D87Q+7HY7ysvL55Uc7Y5XuJCiw4SiKGFnoETgf3R8+OGHcDqdht9RFAVJSUn44IMPMDk5aZAcq45XuIiW6BW/rtvpdFJzczNVVVWFzC0j8A5VX18ffffdd/T777/T3bt3KSUlhTZu3Eg7d+6k3Nxcw/tSAGh8fJxqa2vpzJkzD3x+S0Wu654nGGNwuVzo6ekxdMzmIgJvRt5vn1h2vMJFtEr0ihdNgao4Ly8PXV1dC4pcCCEEJiYmUFFRYZpkkqLvH4wxrF+/HufOnYPX69X/3IIIIfDjjz+isLDQVMkkRS8uGGNISkpCRUUF+vv7DSs89fj9foyPj+PNN99ERkaG6ZIpiqJXfGcsHJxzSk5Opp07d1JJSQlt2rSJsrOzKSUlhaanp2lkZIR6e3ups7OTLl68SIODg1E5j+UQrc7YqhQ9l+D3wuZ+J0wIQX6/nwI1mv4QU5GiLUK0RJu6rtvhcOg3WZ6ofEzObNHp6emGBfRWhjEWtf8wb6rovLw8KXoOjDHKy8vTb44IpolmjNEzzzwjRc8hmvfEVNGlpaVkt9v1SZbFbrdTSUnJ6hNdUFBAa9as0SdZFpfLRQUFBatLNBFRVlYWvfrqq4YZJCuiqiodOnSI1q1bp0+KDPqhsljj8XiQn59vWOJjpWCMYcuWLWHXnkcKU0s0EVFaWhq9/fbblm6r7XY7HTlyhFJTU/VJkUNv3gy8Xi/eeeediE9yrITgnKOhoWHJM25LJS5EB5f+1NTUWEo25xyHDh0Ku5wp0sSFaMyR/e6778LhcKzqNpsxBofDgcbGxphIRjyJRkC21+vFyZMnUVhYGPOFebEIVVWRn5+PkydPwufzxUQy4k10kODarYaGBuTk5CAxMRF8zhd59TcvXoMFPnPFOUdiYiLWr1+PxsZGjI2NLXvJ03IxbZpyMQCg4eFh6unpoY6ODrp69Sr19vaS2+2Oz4+2zcHhcJDL5aInnniCnn32WSotLaWCggLDR+5iRVyLlkQO05+jJbFBirYIUrRFkKItghRtEaRoiyBFWwQp2iJI0RZBirYIUrRFkKItghRtEaRoiyBFWwQp2iJI0RZBirYIUrRFkKItghRtEaRoiyBFWwQp2iJI0RZBirYIUrRFkKItwv8AXQ+odZTexPMAAAAASUVORK5CYII=";

export default function Teligram() {
  const editorRef = useRef(null);
  const imageRef = useRef(null);
  const fileRef = useRef(null);
  const colorRef = useRef(null);
  const selectedTextColorRef = useRef("#111111");
  const bottomRef = useRef(null);
  const chatBodyRef = useRef(null);
  const savedRangeRef = useRef(null);
  const typingFormatsRef = useRef({ bold: false, underline: false, color: "#111111" });
  const verifiedPinRef = useRef("");
  const unlockCheckingRef = useRef(false);
  const unlockRequestIdRef = useRef(0);
  const channelLoadIdRef = useRef(0);
  const notesRequestIdRef = useRef(0);
  const channelAccessGrantedRef = useRef(false);
  const currentDeviceIdRef = useRef("");
  const realtimeTimerRef = useRef(null);
  const isFetchingNotesRef = useRef(false);
  const isSavingNoteRef = useRef(false);
  const skipNextAutoScrollRef = useRef(false);
  const scrollSnapshotRef = useRef(null);
  const noteRefs = useRef({});
  const pinnedScrollTimerRef = useRef(null);
  const imageViewerTouchRef = useRef({
    mode: "",
    startDistance: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  });

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [notes, setNotes] = useState([]);
  const [pinnedNoteIds, setPinnedNoteIds] = useState([]);

  const [channelUnlocked, setChannelUnlocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockChecking, setUnlockChecking] = useState(false);
  const [unlockTrustDevice, setUnlockTrustDevice] = useState(false);

  const [textColor, setTextColor] = useState("#111111");
  const [colorModeActive, setColorModeActive] = useState(false);
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewImages, setPreviewImages] = useState([]);
  const [fullImagePreview, setFullImagePreview] = useState("");
  const [imageViewerLoading, setImageViewerLoading] = useState(false);
  const [imageViewerError, setImageViewerError] = useState(false);
  const [inlineImageStates, setInlineImageStates] = useState({});
  const [imageViewerTransform, setImageViewerTransform] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [brandPop, setBrandPop] = useState(false);
  const [removeOldImage, setRemoveOldImage] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [removeOldFile, setRemoveOldFile] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [composerMode, setComposerMode] = useState("message");
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    underline: false,
    color: "#111111",
  });

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeImageMenu, setActiveImageMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [confirmBox, setConfirmBox] = useState({
    show: false,
    title: "",
    message: "",
    action: null,
  });

  useEffect(() => {
    currentDeviceIdRef.current = getCurrentDeviceId();
    loadSelectedChannel();
  }, []);

  useEffect(() => {
    return () => {
      if (pinnedScrollTimerRef.current) {
        clearTimeout(pinnedScrollTimerRef.current);
        pinnedScrollTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      selectedChannel?.channel_id &&
      (!isTrue(selectedChannel.is_private) || channelUnlocked)
    ) {
      fetchNotes(selectedChannel.channel_id, verifiedPinRef.current || getSavedChannelPin());
    }
  }, [selectedChannel, channelUnlocked]);

  useEffect(() => {
    if (!selectedChannel?.channel_id || typeof window === "undefined") {
      setPinnedNoteIds([]);
      return;
    }

    try {
      const raw = localStorage.getItem(getPinnedNoteKey(selectedChannel.channel_id));
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setPinnedNoteIds(parsed.map(String).slice(0, 5));
      } else if (raw) {
        setPinnedNoteIds([String(raw)]);
      } else {
        setPinnedNoteIds([]);
      }
    } catch {
      const legacy = localStorage.getItem(getPinnedNoteKey(selectedChannel.channel_id));
      setPinnedNoteIds(legacy ? [String(legacy)] : []);
    }
  }, [selectedChannel?.channel_id]);

  useEffect(() => {
    if (realtimeTimerRef.current) {
      clearInterval(realtimeTimerRef.current);
      realtimeTimerRef.current = null;
    }

    if (
      !selectedChannel?.channel_id ||
      (isTrue(selectedChannel.is_private) && !channelUnlocked)
    ) {
      return;
    }

    const refreshMessages = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (isSavingNoteRef.current) return;

      fetchNotes(
        selectedChannel.channel_id,
        verifiedPinRef.current || getSavedChannelPin(),
        true
      );
    };

    realtimeTimerRef.current = setInterval(refreshMessages, REALTIME_REFRESH_MS);
    window.addEventListener("focus", refreshMessages);

    const onVisibilityChange = () => {
      if (!document.hidden) refreshMessages();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (realtimeTimerRef.current) {
        clearInterval(realtimeTimerRef.current);
        realtimeTimerRef.current = null;
      }

      window.removeEventListener("focus", refreshMessages);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [selectedChannel?.channel_id, selectedChannel?.is_private, channelUnlocked]);

  useEffect(() => {
    if (!isTrue(selectedChannel?.is_private) || channelUnlocked) {
      if (skipNextAutoScrollRef.current) {
        restoreChatView();
        return;
      }

      setTimeout(() => {
        const chatBody = chatBodyRef.current;
        if (chatBody && !skipNextAutoScrollRef.current) {
          chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        }
      }, 60);
    }
  }, [notes, selectedChannel, channelUnlocked]);

  const isTrue = (value) => {
    return value === true || value === "true" || value === 1 || value === "1";
  };

  const cleanDeviceId = (value) => {
    return String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9._:-]/g, "")
      .slice(0, 120);
  };

  const getCurrentDeviceId = () => {
    if (typeof window === "undefined") return "";

    if (currentDeviceIdRef.current) {
      return currentDeviceIdRef.current;
    }

    const oldDeviceId = cleanDeviceId(localStorage.getItem(DEVICE_ID_KEY));

    if (oldDeviceId) {
      currentDeviceIdRef.current = oldDeviceId;
      return oldDeviceId;
    }

    const newDeviceId = cleanDeviceId(
      window.crypto?.randomUUID?.() ||
        `device_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );

    localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
    currentDeviceIdRef.current = newDeviceId;

    return newDeviceId;
  };

  const getTrustedPinKey = (channelId) => {
    return `${TRUSTED_PIN_PREFIX}${channelId}`;
  };

  const getTrustedPin = (channelId) => {
    if (!channelId || typeof window === "undefined") return "";
    return localStorage.getItem(getTrustedPinKey(channelId)) || "";
  };

  const saveTrustedPin = (channelId, pin) => {
    const cleanPinValue = String(pin || "").replace(/\D/g, "").slice(0, 4);

    if (!channelId || !/^[0-9]{4}$/.test(cleanPinValue)) return;

    localStorage.setItem(getTrustedPinKey(channelId), cleanPinValue);
  };

  const removeTrustedPin = (channelId) => {
    if (!channelId || typeof window === "undefined") return;
    localStorage.removeItem(getTrustedPinKey(channelId));
  };

  const getSessionVerifiedKey = (channelId) => {
    return `${SESSION_VERIFIED_PREFIX}${channelId}`;
  };

  const getPinnedNoteKey = (channelId) => {
    return `pinned_note_${PUBLIC_USER_ID}_${channelId}`;
  };

  const getLinkedNoteKey = (channelId) => {
    return `linked_note_${PUBLIC_USER_ID}_${channelId}`;
  };

  const getLinkedNoteIds = (channelId) => {
    if (!channelId || typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(getLinkedNoteKey(channelId));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };

  const setLinkedNoteState = (channelId, noteId, linked) => {
    if (!channelId || !noteId || typeof window === "undefined") return;
    const current = new Set(getLinkedNoteIds(channelId));
    const id = String(noteId);
    if (linked) current.add(id);
    else current.delete(id);
    const next = Array.from(current);
    if (next.length) localStorage.setItem(getLinkedNoteKey(channelId), JSON.stringify(next));
    else localStorage.removeItem(getLinkedNoteKey(channelId));
  };

  const savePinnedNoteIds = (channelId, ids) => {
    if (!channelId || typeof window === "undefined") return;
    const cleanIds = Array.from(new Set((ids || []).map(String))).slice(0, 5);
    if (cleanIds.length) localStorage.setItem(getPinnedNoteKey(channelId), JSON.stringify(cleanIds));
    else localStorage.removeItem(getPinnedNoteKey(channelId));
  };

  const hasFrontendVerifiedAccess = (channelId, pin = "") => {
    if (!channelId || typeof window === "undefined") return false;

    const currentDeviceId = getCurrentDeviceId();
    const savedDeviceId = cleanDeviceId(
      localStorage.getItem(SELECTED_CHANNEL_DEVICE_KEY)
    );

    if (!currentDeviceId || !savedDeviceId || currentDeviceId !== savedDeviceId) {
      return false;
    }

    const cleanPinValue = String(pin || "").replace(/\D/g, "").slice(0, 4);
    const savedPin = getSavedChannelPin();
    const trustedPin = getTrustedPin(channelId);

    const pinMatches =
      !cleanPinValue ||
      cleanPinValue === savedPin ||
      cleanPinValue === trustedPin;

    if (!pinMatches) return false;

    const skipVerify =
      localStorage.getItem(SELECTED_CHANNEL_SKIP_VERIFY_KEY) === "true";

    const sessionVerified =
      sessionStorage.getItem(getSessionVerifiedKey(channelId)) === "true";

    const trustedSelected =
      localStorage.getItem(SELECTED_CHANNEL_TRUST_KEY) === "true" &&
      /^[0-9]{4}$/.test(trustedPin);

    return Boolean((skipVerify && sessionVerified) || trustedSelected);
  };

  const markFrontendVerifiedAccess = (
    channelId,
    pin = "",
    trustThisDevice = false
  ) => {
    if (!channelId || typeof window === "undefined") return;

    const currentDeviceId = getCurrentDeviceId();
    const cleanPinValue = String(pin || "").replace(/\D/g, "").slice(0, 4);

    sessionStorage.setItem(getSessionVerifiedKey(channelId), "true");
    localStorage.setItem(SELECTED_CHANNEL_DEVICE_KEY, currentDeviceId);
    localStorage.setItem(SELECTED_CHANNEL_SKIP_VERIFY_KEY, "true");
    localStorage.setItem(SELECTED_CHANNEL_VERIFIED_AT_KEY, String(Date.now()));

    if (/^[0-9]{4}$/.test(cleanPinValue)) {
      localStorage.setItem(SELECTED_CHANNEL_PIN_KEY, cleanPinValue);
    }

    if (trustThisDevice && /^[0-9]{4}$/.test(cleanPinValue)) {
      saveTrustedPin(channelId, cleanPinValue);
      localStorage.setItem(SELECTED_CHANNEL_TRUST_KEY, "true");
    }
  };

  const clearFrontendVerifiedAccess = (channelId = "") => {
    if (typeof window === "undefined") return;

    if (channelId) {
      sessionStorage.removeItem(getSessionVerifiedKey(channelId));
    }

    localStorage.removeItem(SELECTED_CHANNEL_TRUST_KEY);
    localStorage.removeItem(SELECTED_CHANNEL_SKIP_VERIFY_KEY);
    localStorage.removeItem(SELECTED_CHANNEL_DEVICE_KEY);
    localStorage.removeItem(SELECTED_CHANNEL_VERIFIED_AT_KEY);
  };

  const getNoteSenderDeviceId = (note) => {
    return cleanDeviceId(
      note?.sender_device_id ||
        note?.device_id ||
        note?.created_device_id ||
        note?.senderDeviceId ||
        note?.deviceId ||
        ""
    );
  };

  const isMyDeviceNote = (note) => {
    const noteDeviceId = getNoteSenderDeviceId(note);
    const currentDeviceId = getCurrentDeviceId();

    return Boolean(noteDeviceId && currentDeviceId && noteDeviceId === currentDeviceId);
  };

  const getDeviceTheme = (note) => {
    const currentDeviceId = getCurrentDeviceId();
    const noteDeviceId = getNoteSenderDeviceId(note) || `unknown-${note?.note_id || ""}`;

    if (noteDeviceId && currentDeviceId && noteDeviceId === currentDeviceId) {
      return {
        card1: "#dcfce7",
        card2: "#bbf7d0",
        accent: "#16a34a",
        label: "This device",
      };
    }

    let hash = 0;
    for (let i = 0; i < noteDeviceId.length; i += 1) {
      hash = (hash * 31 + noteDeviceId.charCodeAt(i)) >>> 0;
    }

    const [card1, card2, accent] = deviceCardThemes[hash % deviceCardThemes.length];

    return {
      card1,
      card2,
      accent,
      label: "New device",
    };
  };

  const getNotesSignature = (items = []) => {
    return items
      .map((note) => `${note.note_id || ""}:${note.updated_at || note.created_at || ""}:${getNoteSenderDeviceId(note)}`)
      .join("|");
  };

  const parseDateValue = (dateValue) => {
    if (!dateValue) return null;

    if (dateValue instanceof Date) {
      return Number.isNaN(dateValue.getTime()) ? null : dateValue;
    }

    let value = String(dateValue).trim();
    if (!value) return null;

    value = value.replace(" ", "T");

    const hasTimeZone =
      value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value);

    if (!hasTimeZone && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      value = `${value}Z`;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getIndiaDateKey = (dateValue) => {
    const date = parseDateValue(dateValue);
    if (!date) return "unknown";

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  const formatIndiaDateOnly = (dateValue) => {
    const date = parseDateValue(dateValue);
    if (!date) return "";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const formatIndiaTimeOnly = (dateValue) => {
    const date = parseDateValue(dateValue);
    if (!date) return "";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .format(date)
      .replace("am", "AM")
      .replace("pm", "PM");
  };

  const normalizeSearchValue = (value) => {
    return String(value || "")
      .toLowerCase()
      .replace(/[.,/\\|_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const getSearchDateKey = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const monthMap = {
      jan: "01", january: "01",
      feb: "02", february: "02",
      mar: "03", march: "03",
      apr: "04", april: "04",
      may: "05",
      jun: "06", june: "06",
      jul: "07", july: "07",
      aug: "08", august: "08",
      sep: "09", sept: "09", september: "09",
      oct: "10", october: "10",
      nov: "11", november: "11",
      dec: "12", december: "12",
    };

    const normalizeYear = (yearValue) => {
      const year = String(yearValue || "").trim();
      if (/^\d{2}$/.test(year)) return `20${year}`;
      return year;
    };

    const makeKey = (year, month, day) => {
      const yy = normalizeYear(year);
      const mm = String(month || "").padStart(2, "0");
      const dd = String(day || "").padStart(2, "0");

      if (!/^\d{4}$/.test(yy) || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd)) {
        return "";
      }

      const date = new Date(Number(yy), Number(mm) - 1, Number(dd));

      if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !== Number(yy) ||
        date.getMonth() + 1 !== Number(mm) ||
        date.getDate() !== Number(dd)
      ) {
        return "";
      }

      return `${yy}-${mm}-${dd}`;
    };

    let match = raw.match(/^\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\s*$/);
    if (match) return makeKey(match[3], match[2], match[1]);

    match = raw.match(/^\s*(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\s*$/);
    if (match) return makeKey(match[1], match[2], match[3]);

    match = raw.toLowerCase().match(/^\s*(\d{1,2})\s+([a-z]+)\s+(\d{2,4})\s*$/);
    if (match && monthMap[match[2]]) return makeKey(match[3], monthMap[match[2]], match[1]);

    match = raw.toLowerCase().match(/^\s*([a-z]+)\s+(\d{1,2}),?\s+(\d{2,4})\s*$/);
    if (match && monthMap[match[1]]) return makeKey(match[3], monthMap[match[1]], match[2]);

    return "";
  };

  const getNoteDateSearchText = (note) => {
    const messageDate = note?.created_at || note?.updated_at;
    const dateKey = getIndiaDateKey(messageDate);

    if (!messageDate || dateKey === "unknown") return "";

    const reverseParts = dateKey.split("-").reverse();
    const reverseDate = reverseParts.join(" ");
    const slashDate = dateKey.replace(/-/g, "/");
    const indianSlashDate = reverseParts.join("/");
    const indianDashDate = reverseParts.join("-");

    return [
      dateKey,
      slashDate,
      reverseDate,
      indianSlashDate,
      indianDashDate,
      formatIndiaDateOnly(messageDate),
      formatIndiaTimeOnly(messageDate),
    ].join(" ");
  };

  const closeChatKeyboard = () => {
    setActiveMenuId(null);

    if (typeof document !== "undefined" && document.activeElement === editorRef.current) {
      editorRef.current?.blur();
      savedRangeRef.current = null;
    }
  };

  const getSavedChannelPin = () => {
    return localStorage.getItem(SELECTED_CHANNEL_PIN_KEY) || "";
  };

  const getAccessHeaders = (channelOverride = selectedChannel, pinOverride = "") => {
    const headers = {
      "x-device-id": getCurrentDeviceId(),
    };

    const savedPin = pinOverride || verifiedPinRef.current || getSavedChannelPin();

    if (isTrue(channelOverride?.is_private) && savedPin) {
      headers["x-channel-pin"] = savedPin;
    }

    return headers;
  };

  const getJsonHeaders = (channelOverride = selectedChannel, pinOverride = "") => {
    return {
      "Content-Type": "application/json",
      ...getAccessHeaders(channelOverride, pinOverride),
    };
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });

    setTimeout(() => {
      setToast({ show: false, type: "success", message: "" });
    }, 1800);
  };

  const openConfirm = (title, message, action) => {
    setConfirmBox({ show: true, title, message, action });
  };

  const closeConfirm = () => {
    setConfirmBox({ show: false, title: "", message: "", action: null });
  };

  const getInitial = (name) => {
    return name?.trim()?.charAt(0)?.toUpperCase() || "N";
  };

  const normalizeTextColor = (color) => {
    const value = String(color || "").trim();
    return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#111111";
  };

  const getNoteTextColor = (note) => {
    return normalizeTextColor(note?.text_color || note?.textColor || "#111111");
  };

  const setComposerTextColor = (color) => {
    const finalColor = normalizeTextColor(color);
    selectedTextColorRef.current = finalColor;
    setTextColor(finalColor);

    if (editorRef.current) {
      editorRef.current.style.setProperty("--composerColor", finalColor);
      editorRef.current.style.caretColor = finalColor;
    }

    return finalColor;
  };


  const getFileNameFromUrl = (url) => {
    const rawUrl = String(url || "").trim();
    if (!rawUrl) return "";

    const cleaned = rawUrl
      .replace(/\\/g, "/")
      .split("?")[0]
      .split("#")[0];

    return cleaned.split("/").pop() || "";
  };

  const joinApiUrl = (pathValue) => {
    const cleanPath = String(pathValue || "").trim();
    if (!cleanPath) return "";
    if (/^https?:\/\//i.test(cleanPath)) return cleanPath;

    return `${API_URL}${cleanPath.startsWith("/") ? "" : "/"}${cleanPath}`;
  };

  const normalizeApiImageUrl = (url) => {
    const rawUrl = String(url || "").trim();

    if (!rawUrl) return "";
    if (rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) return rawUrl;
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

    const cleanUrl = rawUrl.replace(/\\/g, "/");

    if (cleanUrl.startsWith("/api/") || cleanUrl.startsWith("api/")) {
      return encodeURI(joinApiUrl(cleanUrl));
    }

    // Old /uploads fallback removed intentionally.
    // Backend must return /api/telegram-notes/image/:note_id
    // and /api/telegram-channels/logo/:channel_id.
    return "";
  };

  const getNoteImageUrls = (note) => {
    const list = Array.isArray(note?.image_urls) ? note.image_urls : [];
    const normalized = list.map(normalizeApiImageUrl).filter(Boolean);
    if (normalized.length) return normalized;
    const single = getNoteImageUrl(note);
    return single ? [single] : [];
  };

  const getNoteImageUrl = (note) => {
    const backendUrl = normalizeApiImageUrl(note?.image_url);

    if (backendUrl) return backendUrl;

    if (note?.has_image && note?.note_id) {
      const version = note?.updated_at
        ? new Date(note.updated_at).getTime()
        : Date.now();

      return joinApiUrl(`/api/telegram-notes/image/${note.note_id}?v=${version}`);
    }

    return "";
  };

  const getChannelLogoUrl = (channelOrUrl) => {
    if (!channelOrUrl) return "";

    if (typeof channelOrUrl === "string") {
      return normalizeApiImageUrl(channelOrUrl);
    }

    const backendUrl = normalizeApiImageUrl(channelOrUrl.logo_url);

    if (backendUrl) return backendUrl;

    if (channelOrUrl.has_logo && channelOrUrl.channel_id) {
      const version = channelOrUrl.updated_at
        ? new Date(channelOrUrl.updated_at).getTime()
        : Date.now();

      return joinApiUrl(`/api/telegram-channels/logo/${channelOrUrl.channel_id}?v=${version}`);
    }

    return "";
  };

  const getNoteDownloadUrl = (note) => {
    const backendDownloadUrl = normalizeApiImageUrl(note?.download_url);

    if (backendDownloadUrl) return backendDownloadUrl;

    if (hasNoteImage(note) && note?.note_id) {
      return joinApiUrl(`/api/telegram-notes/image/download/${note.note_id}`);
    }

    return "";
  };

  const getImagePlaceholder = (folder = "telegram-notes") => {
    const label = folder === "telegram-channels" ? "Logo" : "Image";
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
        <rect width="640" height="420" rx="24" fill="#e5e7eb"/>
        <rect x="28" y="28" width="584" height="364" rx="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
        <circle cx="228" cy="168" r="42" fill="#cbd5e1"/>
        <path d="M98 336 L244 218 L336 288 L406 230 L542 336 Z" fill="#cbd5e1"/>
        <text x="320" y="382" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#64748b">${label} not found</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const downloadBlobFromUrl = async (url, fileName, note = null) => {
    if (!url) return false;

    const response = await fetch(url, {
      method: "GET",
      headers: getAccessHeaders(),
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const safeName =
      String(fileName || `download-${note?.note_id || Date.now()}`)
        .replace(/[\\/:*?"<>|]+/g, "_")
        .trim() || `download-${Date.now()}`;

    const objectUrl = URL.createObjectURL(blob);

    // Primary path: browser and mobile WebView download using a local Blob.
    // This avoids relying on the server opening the image in a new tab.
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = safeName;
    link.setAttribute("download", safeName);
    link.style.position = "fixed";
    link.style.left = "-9999px";
    link.style.width = "1px";
    link.style.height = "1px";
    link.style.opacity = "0";
    document.body.appendChild(link);

    try {
      link.click();
    } finally {
      link.remove();
    }

    // Some embedded mobile WebViews do not implement the download attribute.
    // Give those environments a direct Blob URL fallback instead of failing.
    const supportsDownload = "download" in HTMLAnchorElement.prototype;
    if (!supportsDownload) {
      const fallbackWindow = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!fallbackWindow) {
        const fallbackLink = document.createElement("a");
        fallbackLink.href = objectUrl;
        fallbackLink.target = "_blank";
        fallbackLink.rel = "noopener noreferrer";
        fallbackLink.style.display = "none";
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        fallbackLink.remove();
      }
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    return true;
  };

  const downloadNoteImage = async (event, note) => {
    event.preventDefault();
    event.stopPropagation();

    const downloadUrl = getNoteDownloadUrl(note);
    if (!downloadUrl) {
      showToast("Image download unavailable", "error");
      return;
    }

    const fileName =
      getFileNameFromUrl(note?.download_url) ||
      getFileNameFromUrl(note?.image_url) ||
      `note-image-${note?.note_id || Date.now()}.jpg`;

    try {
      await downloadBlobFromUrl(downloadUrl, fileName, note);
      showToast("Download started", "success");
    } catch (error) {
      console.error("Image download error:", error);
      showToast("Download failed", "error");
    }
  };

  const downloadNoteFile = async (event, note) => {
    event.preventDefault();
    event.stopPropagation();

    const downloadUrl = getNoteFileDownloadUrl(note);
    if (!downloadUrl) {
      showToast("File download unavailable", "error");
      return;
    }

    try {
      await downloadBlobFromUrl(downloadUrl, getNoteFileName(note), note);
      showToast("Download started", "success");
    } catch (error) {
      console.error("File download error:", error);
      showToast("Download failed", "error");
    }
  };

  const openNoteFile = (event, note) => {
    event.preventDefault();
    event.stopPropagation();

    const openUrl = isNoteFilePreviewable(note)
      ? getNoteFileUrl(note)
      : getNoteFileDownloadUrl(note);

    if (!openUrl) return;

    window.open(openUrl, "_blank", "noopener,noreferrer");
  };

  const handleImageError = (event, originalUrl = "", folder = "telegram-notes") => {
    const img = event.currentTarget;
    img.onerror = null;

    const logoBox = img.closest(".header-logo, .unlock-logo");

    if (logoBox) {
      logoBox.classList.add("logo-load-failed");
      img.style.display = "none";
      return;
    }

    img.classList.add("image-load-failed");
    img.src = getImagePlaceholder(folder);
  };


  const stripHtml = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html || "";
    return div.textContent || div.innerText || "";
  };


  const isTitleNote = (note) => {
    if (
      note?.is_title === false ||
      note?.is_title === "false" ||
      note?.is_title === 0 ||
      note?.is_title === "0"
    ) {
      return false;
    }

    return (
      String(note?.title || "").trim().toLowerCase() === "title" ||
      isTrue(note?.is_title)
    );
  };

  const hasNoteImage = (note) => {
    return Boolean(note?.image_url || note?.has_image);
  };

  const hasNoteAttachment = (note) => {
    return Boolean(
      note?.has_attachment ||
        note?.attachment_url ||
        (note?.has_file && !hasNoteImage(note) && note?.file_name)
    );
  };

  const hasAnyNoteFile = (note) => {
    return hasNoteImage(note) || hasNoteAttachment(note);
  };

  const getNoteFileName = (note) => {
    return (
      note?.file_name ||
      note?.attachment_name ||
      getFileNameFromUrl(note?.file_download_url) ||
      getFileNameFromUrl(note?.attachment_url) ||
      `attachment-${note?.note_id || Date.now()}`
    );
  };

  const getNoteFileMime = (note) => {
    return String(note?.file_mime || note?.attachment_mime || "").toLowerCase();
  };

  const getNoteFileUrl = (note) => {
    const backendUrl = normalizeApiImageUrl(note?.file_url || note?.attachment_url);

    if (backendUrl) return backendUrl;

    if (hasNoteAttachment(note) && note?.note_id) {
      const version = note?.updated_at
        ? new Date(note.updated_at).getTime()
        : Date.now();

      return joinApiUrl(`/api/telegram-notes/file/${note.note_id}?v=${version}`);
    }

    return "";
  };

  const getNoteFileDownloadUrl = (note) => {
    const backendUrl = normalizeApiImageUrl(
      note?.file_download_url || note?.attachment_download_url
    );

    if (backendUrl) return backendUrl;

    if (hasNoteAttachment(note) && note?.note_id) {
      return joinApiUrl(`/api/telegram-notes/file/download/${note.note_id}`);
    }

    return "";
  };

  const isNoteFilePreviewable = (note) => {
    if (note?.file_previewable === true || note?.file_previewable === "true") {
      return true;
    }

    const mime = getNoteFileMime(note);
    const name = getNoteFileName(note).toLowerCase();

    return (
      mime.startsWith("image/") ||
      mime.startsWith("text/") ||
      mime === "application/pdf" ||
      mime === "application/json" ||
      mime === "application/xml" ||
      name.endsWith(".txt") ||
      name.endsWith(".csv") ||
      name.endsWith(".json") ||
      name.endsWith(".pdf")
    );
  };

  const formatFileSize = (bytes) => {
    const size = Number(bytes || 0);

    if (!size || Number.isNaN(size)) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeLabel = (fileOrNote) => {
    const name = String(
      fileOrNote?.name ||
        fileOrNote?.file_name ||
        fileOrNote?.attachment_name ||
        "file"
    ).toLowerCase();
    const mime = String(
      fileOrNote?.type ||
        fileOrNote?.file_mime ||
        fileOrNote?.attachment_mime ||
        ""
    ).toLowerCase();

    if (mime.includes("pdf") || name.endsWith(".pdf")) return "PDF";
    if (
      mime.includes("spreadsheet") ||
      mime.includes("excel") ||
      name.endsWith(".xls") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".csv")
    ) {
      return "XLS";
    }
    if (
      mime.includes("word") ||
      name.endsWith(".doc") ||
      name.endsWith(".docx")
    ) {
      return "DOC";
    }
    if (mime.startsWith("text/") || name.endsWith(".txt")) return "TXT";
    if (mime.startsWith("image/")) return "IMG";
    if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z")) {
      return "ZIP";
    }

    return "FILE";
  };

  const getFilePreviewName = () => {
    return previewFile?.name || selectedFile?.name || "Selected file";
  };

  const hasNoteText = (note) => {
    return Boolean(stripHtml(note?.content_html || "").trim());
  };

  const getComposerTitleValue = (oldNote) => {
    // Title is a real toggle. When the user turns it OFF, the edited/sent
    // message must become a normal message instead of retaining a hidden title.
    if (composerMode === "title") return "title";
    return "";
  };

  const normalizeEditorHtml = (html) => {
    if (typeof document === "undefined") return html || "";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html || "";

    wrapper.querySelectorAll("font[color]").forEach((fontNode) => {
      const color = normalizeTextColor(fontNode.getAttribute("color"));
      const span = document.createElement("span");
      span.innerHTML = fontNode.innerHTML;
      span.style.setProperty("color", color, "important");
      span.style.setProperty("-webkit-text-fill-color", color, "important");
      fontNode.replaceWith(span);
    });

    wrapper.querySelectorAll("[style]").forEach((element) => {
      const colorValue = element.style.color;

      if (colorValue) {
        element.style.setProperty("color", colorValue, "important");
        element.style.setProperty("-webkit-text-fill-color", colorValue, "important");
      }
    });

    return wrapper.innerHTML.replace(/\u200B/g, "");
  };

  const getEditorHtml = () => {
    const html = editorRef.current?.innerHTML || "";
    const text = editorRef.current?.textContent?.trim() || "";

    if (!text && (html === "<br>" || html === "<div><br></div>")) {
      return "";
    }

    return normalizeEditorHtml(html.trim());
  };

  // Render only the first visual line as a real heading wrapper.
  // The stored HTML remains unchanged; this wrapper is display-only.
  const applyFirstLineHeadingHtml = (html) => {
    if (typeof document === "undefined" || !html) return html || "";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = removeFirstLineHeadingHtml(normalizeEditorHtml(html));

    const heading = document.createElement("strong");
    heading.className = "note-heading-line";

    const isBlock = (node) =>
      node?.nodeType === Node.ELEMENT_NODE &&
      ["DIV", "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "PRE"].includes(node.tagName);

    const firstBlock = Array.from(wrapper.childNodes).find((node) => {
      if (node.nodeType === Node.TEXT_NODE) return Boolean((node.nodeValue || "").trim());
      return isBlock(node) && Boolean((node.textContent || "").trim());
    });

    const source = firstBlock || Array.from(wrapper.childNodes).find((node) => (node.textContent || "").trim());
    if (!source) return wrapper.innerHTML;

    const host = isBlock(source) ? source : wrapper;
    const children = Array.from(host.childNodes);
    let moved = false;

    for (const node of children) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") break;

      if (node.nodeType === Node.TEXT_NODE && /\r?\n/.test(node.nodeValue || "")) {
        const parts = String(node.nodeValue || "").split(/\r?\n/);
        const first = parts.shift() || "";
        if (first) {
          const firstNode = document.createTextNode(first);
          host.replaceChild(firstNode, node);
          heading.appendChild(firstNode);
        }
        break;
      }

      host.removeChild(node);
      heading.appendChild(node);
      moved = true;
    }

    if (!moved && !heading.childNodes.length) return wrapper.innerHTML;
    host.insertBefore(heading, host.firstChild);
    return normalizeEditorHtml(wrapper.innerHTML);
  };

  // Apply only color to the selected range without removing existing bold/underline
  // markup. The new span carries an inline important color so chat and composer
  // render the same color even when parent CSS has a base text color.
  const applyInlineColorToRange = (range, color) => {
    if (!range || range.collapsed) return false;
    const finalColor = normalizeTextColor(color);
    const fragment = range.extractContents();
    const span = document.createElement("span");
    span.style.setProperty("color", finalColor, "important");
    span.style.setProperty("-webkit-text-fill-color", finalColor, "important");
    span.appendChild(fragment);
    range.insertNode(span);

    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    nextRange.collapse(false);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(nextRange);
    }
    savedRangeRef.current = nextRange.cloneRange();
    return true;
  };

  const removeFirstLineHeadingHtml = (html) => {
    if (typeof document === "undefined" || !html) return html || "";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;

    wrapper.querySelectorAll(".note-heading-line").forEach((heading) => {
      const parent = heading.parentNode;
      if (!parent) return;

      while (heading.firstChild) {
        parent.insertBefore(heading.firstChild, heading);
      }
      heading.remove();
    });

    return normalizeEditorHtml(wrapper.innerHTML);
  };

  const getRenderedNoteHtml = (note) => {
    // Title is display-only: only the first visual line is bold.
    const html = note?.content_html || "";
    return isTitleNote(note)
      ? applyFirstLineHeadingHtml(html)
      : removeFirstLineHeadingHtml(html);
  };

  const getComposerContentHtml = () => {
    // Keep stored HTML normal. Title styling is applied only by the editor/card
    // CSS and the title flag. Turning Title off therefore restores normal text.
    return removeFirstLineHeadingHtml(getEditorHtml());
  };

  const placeCaretAtEnd = (element = editorRef.current) => {
    if (!element || typeof window === "undefined") return;

    element.focus();

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);

    const selection = window.getSelection();

    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();

    setTimeout(updateActiveFormats, 0);
  };

  const sanitizeNoteHtml = (html) => {
    return DOMPurify.sanitize(normalizeEditorHtml(html || ""), {
      ADD_TAGS: ["font", "a"],
      ADD_ATTR: ["style", "color", "href", "target", "rel"],
      ALLOW_UNKNOWN_PROTOCOLS: false,
    });
  };

  // Convert the complete URL text into one real anchor so the URL remains
  // fully clickable even when the browser visually wraps it across lines.
  const linkifyNoteHtml = (html) => {
    if (typeof document === "undefined" || !html) return html || "";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const urlPattern = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

    const textNodes = [];
    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (node.parentElement && !node.parentElement.closest("a")) {
        textNodes.push(node);
      }
      node = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
      const value = textNode.nodeValue || "";
      urlPattern.lastIndex = 0;
      if (!urlPattern.test(value)) return;
      urlPattern.lastIndex = 0;

      const fragment = document.createDocumentFragment();
      let cursor = 0;
      let match;

      while ((match = urlPattern.exec(value))) {
        let rawUrl = match[0];
        let trailing = "";

        // Keep sentence punctuation outside the actual URL.
        while (/[.,!?;:)]$/.test(rawUrl) && !/[)]\]/.test(rawUrl)) {
          trailing = rawUrl.slice(-1) + trailing;
          rawUrl = rawUrl.slice(0, -1);
        }

        if (match.index > cursor) {
          fragment.appendChild(document.createTextNode(value.slice(cursor, match.index)));
        }

        const anchor = document.createElement("a");
        anchor.className = "message-link";
        anchor.href = rawUrl.startsWith("www.") ? `https://${rawUrl}` : rawUrl;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.textContent = rawUrl;
        fragment.appendChild(anchor);

        if (trailing) fragment.appendChild(document.createTextNode(trailing));
        cursor = match.index + match[0].length;
      }

      if (cursor < value.length) {
        fragment.appendChild(document.createTextNode(value.slice(cursor)));
      }

      textNode.replaceWith(fragment);
    });

    return normalizeEditorHtml(wrapper.innerHTML);
  };

  const unlinkNoteHtml = (html) => {
    if (typeof document === "undefined" || !html) return html || "";
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    wrapper.querySelectorAll("a.message-link").forEach((anchor) => {
      const parent = anchor.parentNode;
      if (!parent) return;
      while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
      anchor.remove();
    });
    return normalizeEditorHtml(wrapper.innerHTML);
  };

  const preserveChatView = (noteId = "") => {
    const chatBody = chatBodyRef.current;

    if (!chatBody) return;

    const targetNoteId = noteId ? String(noteId) : "";
    const noteElement = targetNoteId ? noteRefs.current[targetNoteId] : null;
    const chatRect = chatBody.getBoundingClientRect();
    const noteRect = noteElement?.getBoundingClientRect?.();

    scrollSnapshotRef.current = {
      top: chatBody.scrollTop,
      height: chatBody.scrollHeight,
      noteId: targetNoteId,
      noteOffset: noteRect ? noteRect.top - chatRect.top : null,
    };

    skipNextAutoScrollRef.current = true;
  };

  const restoreChatView = () => {
    const snapshot = scrollSnapshotRef.current;

    window.requestAnimationFrame(() => {
      const chatBody = chatBodyRef.current;

      if (!chatBody || !snapshot) {
        skipNextAutoScrollRef.current = false;
        scrollSnapshotRef.current = null;
        return;
      }

      const noteElement = snapshot.noteId
        ? noteRefs.current[String(snapshot.noteId)]
        : null;

      if (noteElement && snapshot.noteOffset !== null) {
        const chatRect = chatBody.getBoundingClientRect();
        const noteRect = noteElement.getBoundingClientRect();
        chatBody.scrollTop += noteRect.top - chatRect.top - snapshot.noteOffset;
      } else {
        chatBody.scrollTop = snapshot.top;
      }

      window.requestAnimationFrame(() => {
        skipNextAutoScrollRef.current = false;
        scrollSnapshotRef.current = null;
      });
    });
  };

  const clampImageViewerValue = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
  };

  const getTouchDistance = (touches) => {
    if (!touches || touches.length < 2) return 0;

    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;

    return Math.hypot(dx, dy);
  };

  const openFullImagePreview = (url) => {
    if (!url) return;

    setImageViewerTransform({ scale: 1, x: 0, y: 0 });
    imageViewerTouchRef.current = {
      mode: "",
      startDistance: 0,
      startScale: 1,
      startX: 0,
      startY: 0,
      baseX: 0,
      baseY: 0,
    };
    setImageViewerError(false);
    setImageViewerLoading(true);
    setFullImagePreview(url);
  };

  const closeFullImagePreview = () => {
    setFullImagePreview("");
    setImageViewerLoading(false);
    setImageViewerError(false);
    setImageViewerTransform({ scale: 1, x: 0, y: 0 });
  };

  const handleImageViewerTouchStart = (event) => {
    const touches = event.touches;

    if (touches.length === 2) {
      event.preventDefault();
      imageViewerTouchRef.current = {
        mode: "pinch",
        startDistance: getTouchDistance(touches),
        startScale: imageViewerTransform.scale,
        startX: 0,
        startY: 0,
        baseX: imageViewerTransform.x,
        baseY: imageViewerTransform.y,
      };
      return;
    }

    if (touches.length === 1 && imageViewerTransform.scale > 1) {
      event.preventDefault();
      imageViewerTouchRef.current = {
        ...imageViewerTouchRef.current,
        mode: "drag",
        startX: touches[0].clientX,
        startY: touches[0].clientY,
        baseX: imageViewerTransform.x,
        baseY: imageViewerTransform.y,
      };
    }
  };

  const handleImageViewerTouchMove = (event) => {
    const touches = event.touches;
    const touchData = imageViewerTouchRef.current;

    if (touchData.mode === "pinch" && touches.length === 2) {
      event.preventDefault();

      const nextScale = clampImageViewerValue(
        touchData.startScale * (getTouchDistance(touches) / Math.max(touchData.startDistance, 1)),
        1,
        5
      );

      setImageViewerTransform((prev) => ({
        ...prev,
        scale: nextScale,
        x: nextScale === 1 ? 0 : prev.x,
        y: nextScale === 1 ? 0 : prev.y,
      }));
      return;
    }

    if (touchData.mode === "drag" && touches.length === 1 && imageViewerTransform.scale > 1) {
      event.preventDefault();

      const limit = 160 * imageViewerTransform.scale;

      setImageViewerTransform((prev) => ({
        ...prev,
        x: clampImageViewerValue(touchData.baseX + touches[0].clientX - touchData.startX, -limit, limit),
        y: clampImageViewerValue(touchData.baseY + touches[0].clientY - touchData.startY, -limit, limit),
      }));
    }
  };

  const handleImageViewerTouchEnd = () => {
    imageViewerTouchRef.current.mode = "";

    setImageViewerTransform((prev) => {
      if (prev.scale <= 1.03) {
        return { scale: 1, x: 0, y: 0 };
      }

      return prev;
    });
  };

  const toggleImageViewerZoom = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setImageViewerTransform((prev) =>
      prev.scale > 1
        ? { scale: 1, x: 0, y: 0 }
        : { scale: 2.2, x: 0, y: 0 }
    );
  };

  const loadSelectedChannel = async () => {
    const loadId = ++channelLoadIdRef.current;
    const channelId = localStorage.getItem("selected_channel_id");

    if (!channelId) {
      window.location.hash = "/teligram-channels";
      return;
    }

    try {
      getCurrentDeviceId();

      const res = await fetch(`${API_URL}/api/telegram-channels/${channelId}`, {
        headers: {
          "x-device-id": getCurrentDeviceId(),
        },
      });
      const data = await res.json();

      if (loadId !== channelLoadIdRef.current) return;

      if (!res.ok) {
        showToast("Channel not found", "error");

        setTimeout(() => {
          window.location.hash = "/teligram-channels";
        }, 900);

        return;
      }

      const channel = data.channel;
      setSelectedChannel(channel);
      channelAccessGrantedRef.current = false;

      if (isTrue(channel.is_private)) {
        const savedPin = getSavedChannelPin();
        const trustedPin = getTrustedPin(channel.channel_id);
        const trustedDevice =
          localStorage.getItem(SELECTED_CHANNEL_TRUST_KEY) === "true" &&
          /^[0-9]{4}$/.test(trustedPin);

        // Trusted device access is frontend-only on this page. Do NOT call the
        // PIN verification API while opening the channel; this prevents the
        // temporary mismatch popup seen on trusted devices.
        if (trustedDevice) {
          verifiedPinRef.current = trustedPin;
          channelAccessGrantedRef.current = true;
          localStorage.setItem(SELECTED_CHANNEL_PIN_KEY, trustedPin);
          localStorage.setItem("selected_channel_is_private", "true");
          markFrontendVerifiedAccess(channel.channel_id, trustedPin, true);
          setChannelUnlocked(true);
          setUnlockPin("");
          setUnlockError("");
          setUnlockTrustDevice(false);
          return;
        } else if (/^[0-9]{4}$/.test(savedPin)) {
          // The channel list already verified this PIN in the current flow.
          // Reuse it without another verification call.
          verifiedPinRef.current = savedPin;
          channelAccessGrantedRef.current = true;
          markFrontendVerifiedAccess(channel.channel_id, savedPin, false);
          setChannelUnlocked(true);
          setUnlockPin("");
          setUnlockError("");
          setUnlockTrustDevice(false);
          return;
        }

        verifiedPinRef.current = "";
        channelAccessGrantedRef.current = false;
        localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
        clearFrontendVerifiedAccess(channel.channel_id);
        setChannelUnlocked(false);
        setUnlockPin("");
        setUnlockError("");
        setUnlockTrustDevice(false);
        setNotes([]);
        return;
      }

      verifiedPinRef.current = "";
      channelAccessGrantedRef.current = true;
      localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
      clearFrontendVerifiedAccess(channel.channel_id);
      setChannelUnlocked(true);
      setUnlockPin("");
      setUnlockError("");
      setUnlockTrustDevice(false);
    } catch (error) {
      if (loadId !== channelLoadIdRef.current) return;
      console.error("Channel load error:", error);
      showToast("Server error while opening channel", "error");
    }
  };

  const verifyPinFromApi = async (channelId, pin) => {
    try {
      const cleanPinValue = String(pin || "").replace(/\D/g, "").slice(0, 4);

      if (!channelId || !/^[0-9]{4}$/.test(cleanPinValue)) {
        return false;
      }

      const res = await fetch(
        `${API_URL}/api/telegram-channels/${channelId}/verify-pin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          cache: "no-store",
          body: JSON.stringify({ pin: cleanPinValue }),
        }
      );

      const data = await res.json().catch(() => ({}));
      const messageText = String(data?.message || "").toLowerCase();

      const explicitlyWrong =
        data?.unlocked === false ||
        data?.verified === false ||
        data?.valid === false ||
        data?.pin_match === false ||
        /wrong|mismatch|incorrect|invalid|required|failed|denied/.test(
          messageText
        );

      if (explicitlyWrong) {
        return false;
      }

      return Boolean(
        res.ok &&
          (isTrue(data?.unlocked) ||
            isTrue(data?.success) ||
            isTrue(data?.verified) ||
            isTrue(data?.valid) ||
            isTrue(data?.pin_match) ||
            messageText.includes("verified") ||
            messageText.includes("success") ||
            messageText.includes("public"))
      );
    } catch (error) {
      console.error("Verify PIN API error:", error);
      return false;
    }
  };

  const verifyPrivateChannelPin = async () => {
    if (!selectedChannel || unlockCheckingRef.current) return;

    const pin = unlockPin.replace(/\D/g, "").slice(0, 4);

    if (!/^[0-9]{4}$/.test(pin)) {
      setUnlockError("Enter valid 4 digit PIN");
      return;
    }

    const requestId = ++unlockRequestIdRef.current;
    unlockCheckingRef.current = true;

    try {
      setUnlockChecking(true);
      setUnlockError("");

      const verified = await verifyPinFromApi(selectedChannel.channel_id, pin);

      if (requestId !== unlockRequestIdRef.current) return;

      if (!verified) {
        verifiedPinRef.current = "";
        channelAccessGrantedRef.current = false;
        localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
        clearFrontendVerifiedAccess(selectedChannel.channel_id);
        setUnlockError("Wrong PIN");
        return;
      }

      verifiedPinRef.current = pin;
      channelAccessGrantedRef.current = true;
      localStorage.setItem(SELECTED_CHANNEL_PIN_KEY, pin);
      localStorage.setItem("selected_channel_is_private", "true");
      markFrontendVerifiedAccess(
        selectedChannel.channel_id,
        pin,
        unlockTrustDevice
      );

      if (unlockTrustDevice) {
        saveTrustedPin(selectedChannel.channel_id, pin);
        localStorage.setItem(SELECTED_CHANNEL_TRUST_KEY, "true");
      } else {
        removeTrustedPin(selectedChannel.channel_id);
        localStorage.removeItem(SELECTED_CHANNEL_TRUST_KEY);
      }

      setUnlockError("");
      setUnlockPin("");
      setUnlockTrustDevice(false);
      setChannelUnlocked(true);

      // Notes load once through the channelUnlocked effect.
      // After this, fetchNotes will not call verify-pin again.
    } catch (error) {
      if (requestId !== unlockRequestIdRef.current) return;
      console.error("Unlock error:", error);
      setUnlockError("Server error");
    } finally {
      if (requestId === unlockRequestIdRef.current) {
        unlockCheckingRef.current = false;
        setUnlockChecking(false);
      }
    }
  };

  const fetchNotes = async (channelId, pinOverride = "", silent = false) => {
    if (isFetchingNotesRef.current && silent) return;

    isFetchingNotesRef.current = true;

    const requestId = ++notesRequestIdRef.current;
    const pinForRequest = pinOverride || verifiedPinRef.current || getSavedChannelPin();
    const channelForHeaders = selectedChannel || {
      channel_id: channelId,
      is_private: localStorage.getItem("selected_channel_is_private") === "true",
    };

    try {
      const res = await fetch(
        `${API_URL}/api/telegram-notes?user_id=${PUBLIC_USER_ID}&channel_id=${channelId}`,
        { headers: getAccessHeaders(channelForHeaders, pinForRequest) }
      );

      const data = await res.json();

      if (requestId !== notesRequestIdRef.current) return;

      if (!res.ok) {
        if (res.status === 403 && isTrue(channelForHeaders?.is_private)) {
          /*
            Do not call verify-pin API here.
            If ChannelList already verified the PIN/trusted this device, this
            page simply uses the saved PIN header. A 403 means notes API access
            failed, so show the lock screen without a mismatch popup.
          */
          verifiedPinRef.current = "";
          channelAccessGrantedRef.current = false;
          localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
          clearFrontendVerifiedAccess(channelId);
          setChannelUnlocked(false);
          setNotes([]);
          setUnlockError("");
          return;
        }

        showToast(data.message || "Unable to load messages", "error");
        return;
      }

      const allNotes = data.notes || [];

      const channelNotes = allNotes
        .filter((note) => {
          if (note.channel_id === null || note.channel_id === undefined) {
            return true;
          }

          return Number(note.channel_id) === Number(channelId);
        })
        .map((note) => {
          const normalizedNote = {
            ...note,
            channel_id: note.channel_id || channelId,
            sender_device_id:
              note.sender_device_id ||
              note.device_id ||
              note.created_device_id ||
              "",
          };

          const linkedIds = getLinkedNoteIds(channelId);
          const isLocallyLinked = linkedIds.includes(String(normalizedNote.note_id));
          const hasAnchor = /<a\\b[^>]*class=["\\']message-link["\\'][^>]*>/i.test(
            String(normalizedNote.content_html || "")
          );

          if (isLocallyLinked && !hasAnchor && normalizedNote.content_html) {
            return { ...normalizedNote, content_html: linkifyNoteHtml(normalizedNote.content_html) };
          }

          return normalizedNote;
        });

      setNotes((prev) => {
        if (silent && getNotesSignature(prev) === getNotesSignature(channelNotes)) {
          return prev;
        }

        if (silent) {
          preserveChatView();
        }

        return channelNotes;
      });
    } catch (error) {
      if (requestId !== notesRequestIdRef.current) return;
      console.error("Fetch notes error:", error);
      if (!silent) {
        showToast("Unable to load messages", "error");
      }
    } finally {
      isFetchingNotesRef.current = false;
    }
  };

  const filteredNotes = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchText);
    if (!normalizedQuery) return notes;

    const exactDateKey = getSearchDateKey(searchText);

    if (exactDateKey) {
      return notes.filter((note) =>
        getIndiaDateKey(note.created_at || note.updated_at) === exactDateKey
      );
    }

    const words = normalizedQuery.split(/\s+/).filter(Boolean);

    return notes.filter((note) => {
      const plainText = stripHtml(note.content_html || "");
      const imageText = hasNoteImage(note) ? "image photo picture" : "";
      const fileText = hasNoteAttachment(note)
        ? `file attachment document ${getNoteFileName(note)} ${getFileTypeLabel(note)}`
        : "";
      const dateText = getNoteDateSearchText(note);

      const searchable = normalizeSearchValue(
        `${plainText} ${imageText} ${fileText} ${dateText}`
      );

      return words.every((word) => searchable.includes(word));
    });
  }, [notes, searchText]);

  const groupedNotes = useMemo(() => {
    const sorted = [...filteredNotes].sort((a, b) => {
      const aTime = parseDateValue(a.created_at || a.updated_at)?.getTime() || 0;
      const bTime = parseDateValue(b.created_at || b.updated_at)?.getTime() || 0;
      return aTime - bTime;
    });

    let lastDateKey = "";
    let badgeIndex = -1;

    return sorted.map((note) => {
      const messageDate = note.created_at || note.updated_at;
      const dateKey = getIndiaDateKey(messageDate);
      const showDateBadge = dateKey !== lastDateKey;

      if (showDateBadge) {
        badgeIndex += 1;
        lastDateKey = dateKey;
      }

      const [badgeColor1, badgeColor2] =
        dateBadgeThemes[badgeIndex % dateBadgeThemes.length];

      return {
        note,
        messageDate,
        showDateBadge,
        dateLabel: formatIndiaDateOnly(messageDate),
        badgeColor1,
        badgeColor2,
      };
    });
  }, [filteredNotes]);

  const publicDeviceChipNoteIds = useMemo(() => {
    const firstNoteIds = new Set();
    const seenDeviceIds = new Set();

    if (isTrue(selectedChannel?.is_private)) {
      return firstNoteIds;
    }

    groupedNotes.forEach(({ note }) => {
      const deviceId = getNoteSenderDeviceId(note);

      if (!deviceId || isMyDeviceNote(note) || seenDeviceIds.has(deviceId)) {
        return;
      }

      seenDeviceIds.add(deviceId);
      firstNoteIds.add(String(note.note_id));
    });

    return firstNoteIds;
  }, [groupedNotes, selectedChannel?.is_private]);

  const pinnedNotes = useMemo(() => {
    const byId = new Map(notes.map((note) => [String(note.note_id), note]));
    return pinnedNoteIds.map((id) => byId.get(String(id))).filter(Boolean);
  }, [notes, pinnedNoteIds]);

  const syncTypingMarker = (formats) => {
    if (!editorRef.current) return false;

    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0
      ? selection.getRangeAt(0)
      : savedRangeRef.current;
    if (!range || !range.collapsed) return false;

    const finalColor = normalizeTextColor(formats.color || "#111111");
    const root = editorRef.current;
    const caretNode = range.startContainer;

    // Never stack typing markers. A nested marker inherits the previous marker's
    // formatting, which is what caused Bold-only typing to become Bold+Underline
    // and Underline-only typing to become Bold+Underline. Reuse the current marker
    // whenever the caret is already inside one.
    let marker = null;
    if (caretNode && caretNode.nodeType === Node.TEXT_NODE) {
      marker = caretNode.parentElement?.closest?.('[data-typing-marker="true"]') || null;
    } else if (caretNode instanceof Element) {
      marker = caretNode.closest?.('[data-typing-marker="true"]') || null;
    }

    if (!marker || !root.contains(marker)) {
      marker = document.createElement("span");
      marker.className = "typing-format-marker";
      marker.dataset.typingMarker = "true";
      marker.textContent = "\u200B";
      range.insertNode(marker);
    }

    marker.dataset.bold = formats.bold ? "1" : "0";
    marker.dataset.underline = formats.underline ? "1" : "0";
    marker.style.setProperty("--typing-color", finalColor);
    marker.style.setProperty("font-weight", formats.bold ? "900" : "400", "important");
    marker.style.setProperty("text-decoration", formats.underline ? "underline" : "none", "important");
    marker.style.setProperty("color", finalColor, "important");
    marker.style.setProperty("-webkit-text-fill-color", finalColor, "important");

    const textNode = Array.from(marker.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (!textNode) {
      marker.textContent = "\u200B";
    }

    const caretText = Array.from(marker.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    const nextRange = document.createRange();
    nextRange.setStart(caretText, Math.min(1, caretText.nodeValue?.length || 0));
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    savedRangeRef.current = nextRange.cloneRange();
    return true;
  };
  const saveSelection = (syncFormat = false) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
      if (syncFormat || !range.collapsed) updateActiveFormats(true);
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return false;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
    return true;
  };

  const updateActiveFormats = (syncTyping = false) => {
    try {
      const selection = window.getSelection();
      const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
      // A collapsed caret represents the user's explicit typing mode. Never
      // replace that state with queryCommandState after a mobile toolbar tap.
      if (!syncTyping && range?.collapsed) {
        setActiveFormats({ ...typingFormatsRef.current });
        return;
      }
      const next = {
        ...typingFormatsRef.current,
        bold: Boolean(document.queryCommandState("bold")),
        underline: Boolean(document.queryCommandState("underline")),
      };
      typingFormatsRef.current = next;
      setActiveFormats(next);
    } catch {
      setActiveFormats({ ...typingFormatsRef.current });
    }
  };

  const applySelectedFormat = (type, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    try {
      const selection = window.getSelection();
      const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
      const hasSelection = Boolean(range && !range.collapsed);

      if (type === "bold" || type === "underline") {
        if (hasSelection) {
          document.execCommand("styleWithCSS", false, true);
          document.execCommand(type, false, null);
          const next = {
            ...typingFormatsRef.current,
            [type]: Boolean(document.queryCommandState(type)),
          };
          typingFormatsRef.current = next;
          setActiveFormats(next);
          saveSelection();
        } else {
          const next = {
            ...typingFormatsRef.current,
            [type]: !typingFormatsRef.current[type],
          };
          typingFormatsRef.current = next;
          setActiveFormats(next);
          syncTypingMarker(next);
        }
      }

      if (type === "color") {
        const finalColor = normalizeTextColor(value);
        const currentSelection = window.getSelection();
        const currentRange = currentSelection && currentSelection.rangeCount > 0
          ? currentSelection.getRangeAt(0)
          : savedRangeRef.current;

        typingFormatsRef.current = { ...typingFormatsRef.current, color: finalColor };

        if (currentRange && !currentRange.collapsed) {
          applyInlineColorToRange(currentRange.cloneRange(), finalColor);
          setComposerTextColor(finalColor);
          setColorModeActive(true);
          saveSelection();
        } else {
          setComposerTextColor(finalColor);
          setColorModeActive(true);
          syncTypingMarker(typingFormatsRef.current);
        }
        setActiveFormats({ ...typingFormatsRef.current });
      }
    } catch (error) {
      console.error("Format apply error:", error);
    }
  };
  const applyBold = (e) => {
    e.preventDefault();
    e.stopPropagation();
    applySelectedFormat("bold");
  };

  const applyUnderline = (e) => {
    e.preventDefault();
    e.stopPropagation();
    applySelectedFormat("underline");
  };

  const openColorPicker = (e) => {
    e.preventDefault();
    e.stopPropagation();
    saveSelection();
    colorRef.current?.click();
  };

  const changeColor = (color) => {
    const finalColor = normalizeTextColor(color);
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    try {
      const selection = window.getSelection();
      const range = selection && selection.rangeCount ? selection.getRangeAt(0) : savedRangeRef.current;
      typingFormatsRef.current = { ...typingFormatsRef.current, color: finalColor };
      setActiveFormats({ ...typingFormatsRef.current });
      setColorModeActive(true);
      setComposerTextColor(finalColor);

      if (range && !range.collapsed) {
        applyInlineColorToRange(range.cloneRange(), finalColor);
        saveSelection();
      } else {
        syncTypingMarker(typingFormatsRef.current);
      }
    } catch (error) {
      console.error("Color apply error:", error);
    }
    saveSelection();
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith("image/"))) {
      showToast("Please select only images", "error");
      return;
    }
    if (files.length > 3) {
      showToast("Maximum 3 images allowed", "error");
      return;
    }

    previewImages.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    const urls = files.map((file) => URL.createObjectURL(file));
    setSelectedImages(files);
    setSelectedImage(files[0] || null);
    setPreviewImages(urls);
    setPreviewImage(urls[0] || "");
    setRemoveOldImage(false);
    setSelectedFile(null);
    setPreviewFile(null);
    setRemoveOldFile(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // One upload per note: choosing attachment removes image preview.
    if (previewImage && previewImage.startsWith("blob:")) {
      URL.revokeObjectURL(previewImage);
    }

    setSelectedFile(file);
    setPreviewFile({
      name: file.name || "Selected file",
      size: file.size || 0,
      type: file.type || "application/octet-stream",
      isNew: true,
    });
    setRemoveOldFile(false);
    setSelectedImage(null);
    setSelectedImages([]);
    setPreviewImage("");
    setPreviewImages([]);
    setRemoveOldImage(true);

    if (imageRef.current) {
      imageRef.current.value = "";
    }
  };

  const removeImage = () => {
    if (previewImage && previewImage.startsWith("blob:")) {
      URL.revokeObjectURL(previewImage);
    }

    setSelectedImage(null);
    setSelectedImages([]);
    setPreviewImage("");
    setPreviewImages([]);
    setRemoveOldImage(true);

    if (imageRef.current) {
      imageRef.current.value = "";
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewFile(null);
    setRemoveOldFile(true);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const resetForm = ({ keepPreviewImage = false } = {}) => {
    setComposerTextColor("#111111");
    if (!keepPreviewImage) {
      previewImages.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      if (previewImage && previewImage.startsWith("blob:") && !previewImages.includes(previewImage)) {
        URL.revokeObjectURL(previewImage);
      }
    }

    setSelectedImage(null);
    setSelectedImages([]);
    setPreviewImage("");
    setPreviewImages([]);
    setRemoveOldImage(false);
    setSelectedFile(null);
    setPreviewFile(null);
    setRemoveOldFile(false);
    setEditingNoteId(null);
    setComposerMode("message");
    typingFormatsRef.current = { bold: false, underline: false, color: "#111111" };
    setActiveFormats({ bold: false, underline: false });
    setActiveMenuId(null);
    savedRangeRef.current = null;

    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }

    try {
      if (document.queryCommandState("bold")) {
        document.execCommand("bold", false, null);
      }

      if (document.queryCommandState("underline")) {
        document.execCommand("underline", false, null);
      }

      document.execCommand("foreColor", false, "#111111");
    } catch (error) {
      // Browser can ignore command state reset when the editor is not focused.
    }

    if (imageRef.current) {
      imageRef.current.value = "";
    }

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const toggleComposerTitleMode = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (["image-update", "image-caption", "file-update", "file-caption"].includes(composerMode)) {
      showToast("Heading is for text messages", "error");
      return;
    }

    const turningOff = composerMode === "title";
    const currentHtml = getEditorHtml();

    if (turningOff && editorRef.current && currentHtml) {
      // Remove only the title wrapper; do not leave the first line bold.
      editorRef.current.innerHTML = removeFirstLineHeadingHtml(currentHtml);
    }

    const nextMode = turningOff ? "message" : "title";
    setComposerMode(nextMode);

    setTimeout(() => {
      placeCaretAtEnd();
      setActiveFormats({ ...typingFormatsRef.current });
      syncTypingMarker(typingFormatsRef.current);
    }, 0);
  };
  const saveNote = async () => {
    if (!selectedChannel?.channel_id) {
      showToast("Please open channel first", "error");
      return;
    }

    const contentHtml = getComposerContentHtml();
    const plainText = stripHtml(contentHtml).trim();

    if (!plainText && !selectedImage && !previewImage && !selectedFile && !previewFile) {
      showToast("Please add text, image, or file", "error");
      return;
    }

    const currentImageFiles = selectedImages.length ? selectedImages : (selectedImage ? [selectedImage] : []);
    const currentImageFile = currentImageFiles[0] || null;
    const currentPreviewImages = previewImages.length ? previewImages : (previewImage ? [previewImage] : []);
    const currentPreviewImage = currentPreviewImages[0] || "";
    const currentRemoveImage = removeOldImage;
    const currentFile = selectedFile;
    const currentPreviewFile = previewFile;
    const currentRemoveFile = removeOldFile;
    // Individual text fragments carry their own inline color. The note's base
    // color remains black so a later color choice cannot recolor earlier text.
    const currentTextColor = "#111111";
    const currentDeviceId = getCurrentDeviceId();
    const oldEditingId = editingNoteId;
    const oldNotes = notes;
    const now = new Date().toISOString();
    const tempId = oldEditingId || `temp-${Date.now()}`;

    const oldNote = oldEditingId
      ? notes.find((note) => String(note.note_id) === String(oldEditingId))
      : null;

    const noteTitle = getComposerTitleValue(oldNote);
    const originalDeviceId = getNoteSenderDeviceId(oldNote) || currentDeviceId;

    // Lock realtime replacement while this add/update request is in flight.
    // The optimistic UI is shown immediately; API continues in the background.
    isSavingNoteRef.current = true;

    const optimisticNote = {
      note_id: tempId,
      user_id: PUBLIC_USER_ID,
      channel_id: selectedChannel.channel_id,
      sender_device_id: originalDeviceId,
      device_id: originalDeviceId,
      created_device_id: originalDeviceId,
      title: noteTitle,
      content_html: contentHtml,
      text_color: currentTextColor,
      image_url: currentRemoveImage ? null : currentPreviewImage || null,
      image_urls: currentRemoveImage ? [] : currentPreviewImages,
      image_path: null,
      has_image: currentRemoveImage ? false : Boolean(currentPreviewImage),
      has_attachment: currentRemoveFile ? false : Boolean(currentPreviewFile),
      has_file: currentRemoveImage && currentRemoveFile
        ? false
        : Boolean(currentPreviewImage || currentPreviewFile),
      file_name: currentRemoveFile ? null : currentPreviewFile?.name || null,
      file_mime: currentRemoveFile ? null : currentPreviewFile?.type || null,
      file_size: currentRemoveFile ? null : currentPreviewFile?.size || null,
      file_url: null,
      file_download_url: null,
      attachment_url: null,
      attachment_path: null,
      created_at: oldEditingId ? oldNote?.created_at || now : now,
      updated_at: now,
      is_temp: true,
    };

    if (oldEditingId) {
      preserveChatView(oldEditingId);
      setNotes((prev) =>
        prev.map((note) =>
          String(note.note_id) === String(oldEditingId)
            ? { ...note, ...optimisticNote }
            : note
        )
      );
    } else {
      setNotes((prev) => [...prev, optimisticNote]);
    }

    setSendingMessage(true);
    // Keep the local image URL alive so its optimistic View button works while
    // the upload continues in the background.
    resetForm({ keepPreviewImage: Boolean(currentPreviewImage) });

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_id", selectedChannel.channel_id);
      formData.append("device_id", originalDeviceId);
      formData.append("sender_device_id", originalDeviceId);
      formData.append("created_device_id", originalDeviceId);
      formData.append("title", noteTitle);
      formData.append("content_html", contentHtml);
      formData.append("text_color", currentTextColor);
      formData.append("remove_image", currentRemoveImage ? "true" : "false");
      formData.append("remove_attachment", currentRemoveFile ? "true" : "false");

      currentImageFiles.forEach((file) => formData.append("image", file));

      if (currentFile) {
        formData.append("file", currentFile);
      }

      const url = oldEditingId
        ? `${API_URL}/api/telegram-notes/${oldEditingId}`
        : `${API_URL}/api/telegram-notes`;

      const method = oldEditingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAccessHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Action failed", "error");
        setNotes(oldNotes);

        if (res.status === 403 && !channelAccessGrantedRef.current) {
          setChannelUnlocked(false);
          localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
        }

        return;
      }

      const backendNote = data.note || {};

      const savedNote = {
        ...optimisticNote,
        ...backendNote,
        channel_id: backendNote.channel_id || selectedChannel.channel_id,
        sender_device_id:
          backendNote.sender_device_id ||
          backendNote.device_id ||
          backendNote.created_device_id ||
          originalDeviceId,
        device_id:
          backendNote.device_id ||
          backendNote.sender_device_id ||
          backendNote.created_device_id ||
          originalDeviceId,
        created_device_id:
          backendNote.created_device_id ||
          backendNote.sender_device_id ||
          backendNote.device_id ||
          originalDeviceId,
        title: backendNote.title !== undefined ? backendNote.title : noteTitle,
        text_color: backendNote.text_color || currentTextColor,
        content_html: backendNote.content_html || contentHtml,
        image_url: currentRemoveImage
          ? null
          : backendNote.image_url || optimisticNote.image_url || null,
        image_urls: currentRemoveImage
          ? []
          : Array.isArray(backendNote.image_urls) && backendNote.image_urls.length
            ? backendNote.image_urls
            : optimisticNote.image_urls || [],
        image_path: null,
        has_image: currentRemoveImage
          ? false
          : Boolean(backendNote.has_image || backendNote.image_url || optimisticNote.image_url),
        has_attachment: currentRemoveFile
          ? false
          : Boolean(
              backendNote.has_attachment ||
                backendNote.attachment_url ||
                backendNote.file_name ||
                optimisticNote.file_name
            ),
        has_file: Boolean(
          backendNote.has_file ||
            backendNote.has_image ||
            backendNote.has_attachment ||
            backendNote.file_url ||
            backendNote.image_url ||
            optimisticNote.has_file
        ),
        file_name: backendNote.file_name || backendNote.attachment_name || optimisticNote.file_name || null,
        file_mime: backendNote.file_mime || backendNote.attachment_mime || optimisticNote.file_mime || null,
        file_size: backendNote.file_size || backendNote.attachment_size || optimisticNote.file_size || null,
        file_url: backendNote.file_url || backendNote.attachment_url || optimisticNote.file_url || null,
        file_download_url: backendNote.file_download_url || optimisticNote.file_download_url || null,
        attachment_url: backendNote.attachment_url || optimisticNote.attachment_url || null,
        attachment_path: null,
        file_previewable: backendNote.file_previewable,
        created_at: backendNote.created_at || optimisticNote.created_at,
        updated_at: backendNote.updated_at || new Date().toISOString(),
        is_temp: false,
      };

      if (oldEditingId) {
        preserveChatView(oldEditingId);
        setNotes((prev) =>
          prev.map((note) =>
            String(note.note_id) === String(oldEditingId) ? savedNote : note
          )
        );
      } else {
        setNotes((prev) =>
          prev.map((note) =>
            String(note.note_id) === String(tempId) ? savedNote : note
          )
        );
      }

      if (currentPreviewImage?.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreviewImage);
      }

      fetch(
        `${API_URL}/api/telegram-channels/${selectedChannel.channel_id}/last-message`,
        {
          method: "PATCH",
          headers: getJsonHeaders(),
          body: JSON.stringify({
            last_message: noteTitle === "title"
              ? `Title: ${plainText.slice(0, 70)}`
              : plainText.slice(0, 80) ||
                (currentPreviewFile?.name
                  ? `File: ${currentPreviewFile.name}`
                  : "Image message"),
          }),
        }
      );

      showToast(oldEditingId ? "Message updated" : "Message sent", "success");
    } catch (error) {
      console.error("Save note error:", error);
      showToast("Server error", "error");
      setNotes(oldNotes);
      if (currentPreviewImage?.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreviewImage);
      }
    } finally {
      isSavingNoteRef.current = false;
      setLoading(false);
      setSendingMessage(false);
    }
  };

  const setTypingColorAtCaret = (color) => {
    if (!editorRef.current) return false;

    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0
      ? selection.getRangeAt(0)
      : savedRangeRef.current;

    if (!range || !range.collapsed) return false;

    const marker = document.createElement("span");
    const finalColor = normalizeTextColor(color);
    marker.style.setProperty("color", finalColor, "important");
    marker.style.setProperty("-webkit-text-fill-color", finalColor, "important");
    marker.textContent = "\u200B";
    range.insertNode(marker);

    const nextRange = document.createRange();
    nextRange.setStart(marker.firstChild, 1);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    savedRangeRef.current = nextRange.cloneRange();

    return true;
  };

  const startEdit = (note) => {
    if (note.is_temp) return;

    const noteHasImage = hasNoteImage(note);
    const noteHasAttachment = hasNoteAttachment(note);

    setEditingNoteId(note.note_id);
    setComposerMode(
      isTitleNote(note)
        ? "title"
        : noteHasImage
          ? "image-caption"
          : noteHasAttachment
            ? "file-caption"
            : "message"
    );
    setComposerTextColor(getNoteTextColor(note));
    const noteImageUrls = noteHasImage ? getNoteImageUrls(note) : [];
    setPreviewImage(noteImageUrls[0] || "");
    setPreviewImages(noteImageUrls);
    setSelectedImage(null);
    setSelectedImages([]);
    setRemoveOldImage(false);
    setSelectedFile(null);
    setPreviewFile(
      noteHasAttachment
        ? {
            name: getNoteFileName(note),
            size: note.file_size || note.attachment_size || 0,
            type: getNoteFileMime(note) || "application/octet-stream",
            isNew: false,
          }
        : null
    );
    setRemoveOldFile(false);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = normalizeEditorHtml(note.content_html || "");
    }

    requestAnimationFrame(() => {
      placeCaretAtEnd();
      editorRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
    });
  };

  const startImageUpdate = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode("image-update");
    setComposerTextColor(getNoteTextColor(note));
    const noteImageUrls = getNoteImageUrls(note);
    setPreviewImage(noteImageUrls[0] || "");
    setPreviewImages(noteImageUrls);
    setSelectedImage(null);
    setSelectedImages([]);
    setRemoveOldImage(false);
    setSelectedFile(null);
    setPreviewFile(null);
    setRemoveOldFile(true);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = normalizeEditorHtml(note.content_html || "");
      placeCaretAtEnd();
    }

    setTimeout(() => {
      imageRef.current?.click();
    }, 80);
  };

  const startImageCaption = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode("image-caption");
    setComposerTextColor(getNoteTextColor(note));
    const noteImageUrls = getNoteImageUrls(note);
    setPreviewImage(noteImageUrls[0] || "");
    setPreviewImages(noteImageUrls);
    setSelectedImage(null);
    setSelectedImages([]);
    setRemoveOldImage(false);
    setSelectedFile(null);
    setPreviewFile(null);
    setRemoveOldFile(true);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = normalizeEditorHtml(note.content_html || "");
    }

    setTimeout(() => {
      placeCaretAtEnd();
    }, 100);
  };

  const startFileUpdate = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode("file-update");
    setComposerTextColor(getNoteTextColor(note));
    setPreviewImage("");
    setSelectedImage(null);
    setRemoveOldImage(true);
    setSelectedFile(null);
    setPreviewFile({
      name: getNoteFileName(note),
      size: note.file_size || note.attachment_size || 0,
      type: getNoteFileMime(note) || "application/octet-stream",
      isNew: false,
    });
    setRemoveOldFile(false);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = normalizeEditorHtml(note.content_html || "");
      placeCaretAtEnd();
    }

    setTimeout(() => {
      fileRef.current?.click();
    }, 80);
  };

  const startFileCaption = (note) => {
    if (note.is_temp) return;

    setEditingNoteId(note.note_id);
    setComposerMode("file-caption");
    setComposerTextColor(getNoteTextColor(note));
    setPreviewImage("");
    setSelectedImage(null);
    setRemoveOldImage(true);
    setSelectedFile(null);
    setPreviewFile({
      name: getNoteFileName(note),
      size: note.file_size || note.attachment_size || 0,
      type: getNoteFileMime(note) || "application/octet-stream",
      isNew: false,
    });
    setRemoveOldFile(false);
    setActiveMenuId(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = normalizeEditorHtml(note.content_html || "");
    }

    setTimeout(() => {
      placeCaretAtEnd();
    }, 100);
  };

  const markNoteAsTitle = async (note) => {
    if (note.is_temp || hasAnyNoteFile(note)) return;

    const oldNotes = notes;
    const noteWasTitle = isTitleNote(note);
    const nextTitle = noteWasTitle ? "" : "title";
    const nextContentHtml = removeFirstLineHeadingHtml(note.content_html || "");
    const successMessage = noteWasTitle ? "Title style removed" : "Title style added";

    // Keep the optimistic title change visible until the API finishes.
    isSavingNoteRef.current = true;

    setActiveMenuId(null);
    preserveChatView(note.note_id);

    setNotes((prev) =>
      prev.map((item) =>
        String(item.note_id) === String(note.note_id)
          ? { ...item, title: nextTitle, content_html: nextContentHtml, updated_at: new Date().toISOString() }
          : item
      )
    );

    try {
      setLoading(true);

      const formData = new FormData();
      const noteDeviceId = getNoteSenderDeviceId(note) || getCurrentDeviceId();

      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_id", selectedChannel.channel_id);
      formData.append("device_id", noteDeviceId);
      formData.append("sender_device_id", noteDeviceId);
      formData.append("created_device_id", noteDeviceId);
      formData.append("title", nextTitle);
      formData.append("is_title", nextTitle === "title" ? "true" : "false");
      formData.append("title_mode", nextTitle === "title" ? "title" : "normal");
      formData.append("note_type", nextTitle === "title" ? "title" : "normal");
      formData.append("content_html", nextContentHtml);
      formData.append("text_color", note.text_color || "#111111");
      formData.append("remove_image", "false");
      formData.append("remove_attachment", "false");

      const res = await fetch(`${API_URL}/api/telegram-notes/${note.note_id}`, {
        method: "PUT",
        headers: getAccessHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        preserveChatView(note.note_id);
        setNotes(oldNotes);
        showToast(data.message || "Title update failed", "error");
        return;
      }

      const backendNote = data.note || {};

      preserveChatView(note.note_id);

      setNotes((prev) =>
        prev.map((item) =>
          String(item.note_id) === String(note.note_id)
            ? { ...item, ...backendNote, title: nextTitle, content_html: nextContentHtml }
            : item
        )
      );

      showToast(successMessage, "success");
    } catch (error) {
      console.error("Title update error:", error);
      preserveChatView(note.note_id);
      setNotes(oldNotes);
      showToast("Server error", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleNoteLink = async (note) => {
    if (note?.is_temp) return;

    const currentHtml = note?.content_html || "";
    const isLinked = /<a\b[^>]*class=["\']message-link["\'][^>]*>/i.test(currentHtml);
    const nextContentHtml = isLinked ? unlinkNoteHtml(currentHtml) : linkifyNoteHtml(currentHtml);

    if (!nextContentHtml || nextContentHtml === currentHtml) {
      setActiveMenuId(null);
      showToast(isLinked ? "No link to remove" : "No link found in this message", "error");
      return;
    }

    setLinkedNoteState(selectedChannel?.channel_id, note.note_id, !isLinked);

    const oldNotes = notes;
    isSavingNoteRef.current = true;
    setActiveMenuId(null);
    preserveChatView(note.note_id);
    setNotes((prev) => prev.map((item) =>
      String(item.note_id) === String(note.note_id)
        ? { ...item, content_html: nextContentHtml, updated_at: new Date().toISOString() }
        : item
    ));

    try {
      const formData = new FormData();
      const noteDeviceId = getNoteSenderDeviceId(note) || getCurrentDeviceId();
      formData.append("user_id", PUBLIC_USER_ID);
      formData.append("channel_id", selectedChannel.channel_id);
      formData.append("device_id", noteDeviceId);
      formData.append("sender_device_id", noteDeviceId);
      formData.append("created_device_id", noteDeviceId);
      formData.append("title", note.title || "");
      formData.append("is_title", isTitleNote(note) ? "true" : "false");
      formData.append("title_mode", isTitleNote(note) ? "title" : "normal");
      formData.append("note_type", isTitleNote(note) ? "title" : "normal");
      formData.append("content_html", nextContentHtml);
      formData.append("text_color", note.text_color || "#111111");
      formData.append("remove_image", "false");
      formData.append("remove_attachment", "false");

      const res = await fetch(`${API_URL}/api/telegram-notes/${note.note_id}`, {
        method: "PUT",
        headers: getAccessHeaders(),
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setLinkedNoteState(selectedChannel?.channel_id, note.note_id, isLinked);
        preserveChatView(note.note_id);
        setNotes(oldNotes);
        showToast(data.message || (isLinked ? "Unlink update failed" : "Link update failed"), "error");
        return;
      }

      const backendNote = data.note || {};
      preserveChatView(note.note_id);
      setNotes((prev) => prev.map((item) =>
        String(item.note_id) === String(note.note_id)
          ? { ...item, ...backendNote, content_html: nextContentHtml }
          : item
      ));
      showToast(isLinked ? "Link removed" : "Link enabled", "success");
    } catch (error) {
      console.error("Link toggle error:", error);
      setLinkedNoteState(selectedChannel?.channel_id, note.note_id, isLinked);
      preserveChatView(note.note_id);
      setNotes(oldNotes);
      showToast("Server error", "error");
    } finally {
      isSavingNoteRef.current = false;
    }
  };
  const togglePinnedNote = (note) => {
    if (!selectedChannel?.channel_id || !note?.note_id) return;
    const noteId = String(note.note_id);
    const alreadyPinned = pinnedNoteIds.some((id) => String(id) === noteId);
    let nextPins;
    if (alreadyPinned) {
      nextPins = pinnedNoteIds.filter((id) => String(id) !== noteId);
    } else {
      if (pinnedNoteIds.length >= 5) {
        showToast("Maximum 5 pinned messages", "error");
        return;
      }
      nextPins = [...pinnedNoteIds, noteId];
    }
    setActiveMenuId(null);
    setPinnedNoteIds(nextPins);
    savePinnedNoteIds(selectedChannel.channel_id, nextPins);
    showToast(alreadyPinned ? "Pin removed" : "Message pinned", "success");
  };
  const getPinnedNotePreview = (note) => {
    if (!note) return "Pinned message";

    const text = stripHtml(note.content_html || "").trim();

    if (text) {
      return text.length > 58 ? `${text.slice(0, 58)}...` : text;
    }

    if (hasNoteImage(note)) return "Pinned image";
    if (hasNoteAttachment(note)) return `Pinned file: ${getNoteFileName(note)}`;

    return "Pinned message";
  };

  const refreshCurrentPage = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (
      manualRefreshing ||
      isFetchingNotesRef.current ||
      isSavingNoteRef.current ||
      !selectedChannel?.channel_id ||
      (isTrue(selectedChannel.is_private) && !channelUnlocked)
    ) {
      return;
    }

    preserveChatView();
    setManualRefreshing(true);

    try {
      await fetchNotes(
        selectedChannel.channel_id,
        verifiedPinRef.current || getSavedChannelPin(),
        true
      );
    } finally {
      setManualRefreshing(false);
    }
  };

  const htmlToClipboardText = (html) => {
    if (typeof document === "undefined") return "";
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html || "";

    const render = (node, listState = null) => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = node.tagName.toLowerCase();
      let out = "";
      if (tag === "br") return "\n";
      if (tag === "li") {
        const index = listState?.ordered ? listState.index++ : null;
        const prefix = listState?.ordered ? `${index}. ` : "- ";
        out += prefix;
      }
      const childListState = tag === "ol" ? { ordered: true, index: 1 } : tag === "ul" ? { ordered: false } : listState;
      for (const child of node.childNodes) out += render(child, childListState);
      if (["div","p","li","section","article","h1","h2","h3","h4","h5","h6","pre"].includes(tag)) out += "\n";
      return out;
    };

    return render(wrapper)
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\n+|\n+$/g, "")
      .replace(/[ \t]+\n/g, "\n");
  };

  const copyNoteText = async (event, note) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const htmlValue = sanitizeNoteHtml(note?.content_html || "");
    const text = htmlToClipboardText(htmlValue).trim();
    const copyValue =
      text ||
      (hasNoteAttachment(note)
        ? getNoteFileName(note)
        : hasNoteImage(note)
          ? "Image"
          : "");

    if (!copyValue) {
      showToast("No text to copy", "error");
      return;
    }

    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined" && htmlValue) {
        const item = new ClipboardItem({
          "text/html": new Blob([htmlValue], { type: "text/html" }),
          "text/plain": new Blob([copyValue], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyValue);
      } else {
        const helper = document.createElement("textarea");
        helper.value = copyValue;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }

      setActiveMenuId(null);
      showToast("Copied", "success");
    } catch (error) {
      console.error("Copy note text error:", error);
      showToast("Copy failed", "error");
    }
  };

  const goToPinnedNote = (noteId) => {
    const targetId = String(noteId || "");
    setShowPinnedList(false);
    if (!targetId) return;
    const target = noteRefs.current[targetId];
    if (!target) {
      showToast("Pinned message not found", "error");
      return;
    }
    setActiveMenuId(null);
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (pinnedScrollTimerRef.current) clearTimeout(pinnedScrollTimerRef.current);
    pinnedScrollTimerRef.current = null;
  };
  const deleteNote = async (noteId) => {
    const oldNotes = notes;

    // Lock realtime replacement first. The deleted card disappears immediately
    // while the DELETE request runs in the background.
    isSavingNoteRef.current = true;

    preserveChatView(noteId);

    setNotes((prev) =>
      prev.filter((note) => String(note.note_id) !== String(noteId))
    );

    setActiveMenuId(null);

    if (pinnedNoteIds.some((id) => String(id) === String(noteId))) {
      const nextPins = pinnedNoteIds.filter((id) => String(id) !== String(noteId));
      setPinnedNoteIds(nextPins);
      savePinnedNoteIds(selectedChannel?.channel_id, nextPins);
    }

    try {
      const res = await fetch(`${API_URL}/api/telegram-notes/${noteId}`, {
        method: "DELETE",
        headers: getAccessHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Delete failed", "error");
        // API failed: restore the previous UI exactly.
        preserveChatView();
        setNotes(oldNotes);

        if (res.status === 403 && !channelAccessGrantedRef.current) {
          setChannelUnlocked(false);
          localStorage.removeItem(SELECTED_CHANNEL_PIN_KEY);
        }

        return;
      }

      showToast("Deleted", "deleted");
    } catch (error) {
      console.error("Delete note error:", error);
      showToast("Server error while deleting", "error");
      preserveChatView();
      setNotes(oldNotes);
    } finally {
      isSavingNoteRef.current = false;
      setLoading(false);
    }
  };

  const backToChannels = () => {
    resetForm();
    window.location.hash = "/teligram-channels";
  };

  const privateChannelLocked =
    selectedChannel &&
    isTrue(selectedChannel.is_private) &&
    !channelUnlocked &&
    !channelAccessGrantedRef.current;

  return (
    <div className="nm-screen" onClick={() => setActiveMenuId(null)}>
      <div className="nm-phone">
        <header className="nm-header">
          <button className="header-icon-btn back-btn" onClick={backToChannels}>
            ‹
          </button>

          <div
            className={`header-brand-row ${brandPop ? "brand-pop" : ""}`}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setBrandPop(true);
              window.setTimeout(() => setBrandPop(false), 420);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setBrandPop(true);
                window.setTimeout(() => setBrandPop(false), 420);
              }
            }}
            aria-label="Channel info"
          >
            <div className="header-logo">
              {(selectedChannel?.logo_url || selectedChannel?.has_logo) && (
                <img
                  src={getChannelLogoUrl(selectedChannel)}
                  alt="logo"
                  onError={(e) => handleImageError(e, "", "telegram-channels")}
                />
              )}
              <span className="logo-fallback-letter">
                {getInitial(selectedChannel?.channel_name)}
              </span>
            </div>

            <div className="header-title">
              <h2>{selectedChannel?.channel_name || "Notes"}</h2>
              {selectedChannel?.channel_tagline && (
                <p>{selectedChannel.channel_tagline}</p>
              )}
            </div>
          </div>

          {!privateChannelLocked && (
            <button
              type="button"
              className={`header-icon-btn search-btn ${searchOpen ? "active" : ""}`}
              onClick={() => {
                setSearchOpen(!searchOpen);
                setSearchText("");
              }}
              title="Search"
              aria-label="Search"
            >
              🔍
            </button>
          )}
        </header>

        {privateChannelLocked ? (
          <main className="unlock-screen">
            <div className="unlock-card">
              <div className="unlock-logo">
                {(selectedChannel?.logo_url || selectedChannel?.has_logo) && (
                  <img
                    src={getChannelLogoUrl(selectedChannel)}
                    alt="logo"
                    onError={(e) => handleImageError(e, "", "telegram-channels")}
                  />
                )}
                <span className="logo-fallback-letter">
                  {getInitial(selectedChannel?.channel_name)}
                </span>
              </div>

              <div className="unlock-lock">🔐</div>

              <h3>Private Channel</h3>

              <p>
                Enter 4 digit PIN to open <b>{selectedChannel?.channel_name}</b>
              </p>

              {selectedChannel?.channel_tagline && (
                <div className="unlock-tagline">
                  {selectedChannel.channel_tagline}
                </div>
              )}

              <input
                className="center-pin-input"
                type="text"
                inputMode="numeric"
                maxLength="4"
                placeholder="0000"
                value={unlockPin}
                autoFocus
                onChange={(e) => {
                  setUnlockPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setUnlockError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    verifyPrivateChannelPin();
                  }
                }}
              />

              <label className="trust-device-row">
                <input
                  type="checkbox"
                  checked={unlockTrustDevice}
                  onChange={(e) => setUnlockTrustDevice(e.target.checked)}
                  disabled={unlockChecking}
                />
                <span className="trust-device-checkmark">✓</span>
                <span className="trust-device-label">Trust this device</span>
              </label>

              <p className="trust-device-hint">
                Next time this device can open the channel without asking for the PIN.
              </p>

              {unlockError && <div className="unlock-error">{unlockError}</div>}

              <button
                className="unlock-open-btn"
                onClick={verifyPrivateChannelPin}
                disabled={unlockChecking}
              >
                {unlockChecking ? "Checking..." : "Open Channel"}
              </button>

              <button className="unlock-back-btn" onClick={backToChannels}>
                Back
              </button>
            </div>
          </main>
        ) : (
          <>
            {searchOpen && (
              <div className="search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search text, file, or date..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchText("");
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {searchOpen && searchText.trim() && (
              <div className="search-result-bar">
                Showing {filteredNotes.length} result{filteredNotes.length === 1 ? "" : "s"} for "{searchText.trim()}"
              </div>
            )}

            {pinnedNotes.length > 0 && (
              <div className="pin-section">
                <button
                  type="button"
                  className={`pin-section-trigger ${showPinnedList ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPinnedList((value) => !value);
                  }}
                  title={showPinnedList ? "Hide pinned messages" : "Show pinned messages"}
                  aria-expanded={showPinnedList}
                >
                  <span className="pin-section-round-icon">📌</span>
                  <span className="pin-section-count">{pinnedNotes.length}</span>
                </button>

                {showPinnedList && (
                  <div className="pinned-note-jump-list" onClick={(e) => e.stopPropagation()}>
                    {pinnedNotes.map((pin, index) => (
                      <button
                        type="button"
                        className="pinned-note-jump"
                        key={pin.note_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPinnedNote(pin.note_id);
                        }}
                        title={`Go to pinned message ${index + 1}`}
                      >
                        <span className="pinned-note-icon">📌</span>
                        <span className="pinned-note-label">Pin {index + 1}</span>
                        <strong>{getPinnedNotePreview(pin)}</strong>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <main ref={chatBodyRef} className="chat-body" onClick={closeChatKeyboard}>
              {manualRefreshing && (
                <div className="professional-refresh-overlay" role="status" aria-label="Refreshing messages">
                  <div className="professional-refresh-card"><span className="professional-refresh-spinner" />Refreshing</div>
                </div>
              )}
              {groupedNotes.length === 0 && (
                <div className="empty-card">
                  <div className="empty-icon">✦</div>
                  <h3>{searchText ? "No match found" : "No messages yet"}</h3>
                  <p>
                    {searchText
                      ? "Try another search word"
                      : "Start typing below"}
                  </p>
                </div>
              )}

              {groupedNotes.map(
                ({
                  note,
                  messageDate,
                  showDateBadge,
                  dateLabel,
                  badgeColor1,
                  badgeColor2,
                }) => {
                  const hasText = hasNoteText(note);
                  const hasImage = hasNoteImage(note);
                  const hasAttachment = hasNoteAttachment(note);
                  const titleMessage = isTitleNote(note);
                  const rawNoteHtml = String(note.content_html || "");
                  const linkMessage = /<a\b[^>]*class=["\']message-link["\'][^>]*>/i.test(rawNoteHtml);
                  const messageFromThisDevice = isMyDeviceNote(note);
                  const deviceTheme = getDeviceTheme(note);
                  const showDeviceChip =
                    !messageFromThisDevice &&
                    !isTrue(selectedChannel?.is_private) &&
                    publicDeviceChipNoteIds.has(String(note.note_id));

                  const pinnedMessage = pinnedNoteIds.some((id) => String(id) === String(note.note_id));

                  return (
                    <div
                      className={`note-block ${pinnedMessage ? "pinned-note-block" : ""}`}
                      key={note.note_id}
                      ref={(element) => {
                        if (element) {
                          noteRefs.current[String(note.note_id)] = element;
                        } else {
                          delete noteRefs.current[String(note.note_id)];
                        }
                      }}
                    >
                      {showDateBadge && (
                        <div className="date-separator">
                          <span
                            style={{
                              "--badge1": badgeColor1,
                              "--badge2": badgeColor2,
                              background: `linear-gradient(135deg, ${badgeColor1}, ${badgeColor2})`,
                            }}
                          >
                            {dateLabel}
                          </span>
                        </div>
                      )}

                      <div
                        className={`message-line ${
                          messageFromThisDevice
                            ? "my-message-line"
                            : "other-message-line"
                        } ${
                          String(activeMenuId) === String(note.note_id) ? "message-active" : ""
                        }`}
                        onClick={() => setActiveMenuId(null)}
                      >
                        <div
                          className={`message-bubble ${
                            messageFromThisDevice
                              ? "my-message-bubble"
                              : "other-message-bubble"
                          } ${
                            hasImage && !hasText ? "image-only" : ""
                          } ${hasAttachment && !hasText ? "file-only" : ""} ${
                            titleMessage ? "title-bubble" : ""
                          } ${showDeviceChip ? "new-device-message" : ""} ${pinnedMessage ? "pinned-message-bubble" : ""}`}
                          style={{
                            "--device-card-1": deviceTheme.card1,
                            "--device-card-2": deviceTheme.card2,
                            "--device-accent": deviceTheme.accent,
                          }}
                          onDoubleClick={(e) => {
                            if (!note.is_temp && hasText && !hasImage && !hasAttachment) {
                              e.stopPropagation();
                              markNoteAsTitle(note);
                            }
                          }}
                        >
                          {showDeviceChip && (
                            <div className="device-source-chip">ND</div>
                          )}

                          {titleMessage && (
                            <span className="message-title-badge" aria-label="Title">
                              TITLE
                            </span>
                          )}

                          {linkMessage && (
                            <span className="message-link-badge" aria-label="Link">
                              LINK
                            </span>
                          )}

                          {pinnedMessage && (
                            <button
                              type="button"
                              className="pinned-message-chip"
                              title="Open pinned message"
                              onClick={(e) => {
                                e.stopPropagation();
                                goToPinnedNote(note.note_id);
                              }}
                            >
                              📌
                            </button>
                          )}

                          <button
                            className="message-dot-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveImageMenu(null);
                              setActiveMenuId(
                                String(activeMenuId) === String(note.note_id)
                                  ? null
                                  : note.note_id
                              );
                            }}
                            title="Options"
                          >
                            ⋮
                          </button>

                          {hasImage && (
                            <div className={`image-message-wrap ${hasText ? "with-description" : ""}`}>
                              {inlineImageStates[String(note.note_id)] === "loaded" ? (
                                <div className="whatsapp-image-frame">
                                  <div className="message-image-grid">
                                    {getNoteImageUrls(note).map((imageUrl, imageIndex) => (
                                      <div
                                        key={`${note.note_id}-${imageIndex}`}
                                        className="message-image-item"
                                      >
                                        <img
                                          src={imageUrl}
                                          alt={`note ${imageIndex + 1}`}
                                          className="message-image"
                                          onError={() =>
                                            setInlineImageStates((states) => ({
                                              ...states,
                                              [String(note.note_id)]: "error",
                                            }))
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openFullImagePreview(imageUrl);
                                          }}
                                        />
                                        <button
                                          type="button"
                                          className="message-image-dot-btn"
                                          title={`Image ${imageIndex + 1} options`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(null);
                                            setActiveImageMenu((current) =>
                                              current &&
                                              String(current.noteId) === String(note.note_id) &&
                                              Number(current.imageIndex) === imageIndex
                                                ? null
                                                : { noteId: note.note_id, imageIndex }
                                            );
                                          }}
                                        >
                                          ⋮
                                        </button>

                                        {activeImageMenu &&
                                          String(activeImageMenu.noteId) === String(note.note_id) &&
                                          Number(activeImageMenu.imageIndex) === imageIndex && (
                                            <div
                                              className="message-image-mini-menu"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActiveImageMenu(null);
                                                  openFullImagePreview(imageUrl);
                                                }}
                                              >
                                                View
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async (e) => {
                                                  await downloadBlobFromUrl(
                                                    imageUrl,
                                                    `note-image-${note.note_id}-${imageIndex + 1}.jpg`,
                                                    note
                                                  );
                                                  setActiveImageMenu(null);
                                                  e.currentTarget.blur();
                                                }}
                                              >
                                                Download
                                              </button>
                                            </div>
                                          )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="image-view-card"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveImageMenu(null);
                                    setInlineImageStates((states) => ({
                                      ...states,
                                      [String(note.note_id)]: "loading",
                                    }));
                                  }}
                                  aria-label="View image"
                                >
                                  {inlineImageStates[String(note.note_id)] === "loading" ? (
                                    <>
                                      <span className="image-spinner image-card-spinner" />
                                      <img
                                        src={getNoteImageUrl(note)}
                                        alt=""
                                        className="inline-image-preloader"
                                        onLoad={() =>
                                          setInlineImageStates((states) => ({
                                            ...states,
                                            [String(note.note_id)]: "loaded",
                                          }))
                                        }
                                        onError={() =>
                                          setInlineImageStates((states) => ({
                                            ...states,
                                            [String(note.note_id)]: "error",
                                          }))
                                        }
                                      />
                                    </>
                                  ) : (
                                    <span>{inlineImageStates[String(note.note_id)] === "error" ? "Image unavailable" : "View image"}</span>
                                  )}
                                </button>
                              )}

                              {hasText && (
                                <div
                                  className="image-description-text"
                                  style={{ "--noteColor": getNoteTextColor(note), color: getNoteTextColor(note) }}
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeNoteHtml(getRenderedNoteHtml(note)),
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {hasAttachment && (
                            <div className={`file-message-wrap ${hasText ? "with-description" : ""}`}>
                              <button
                                type="button"
                                className="file-card"
                                onClick={(e) => openNoteFile(e, note)}
                                title={isNoteFilePreviewable(note) ? "Open file" : "Download file"}
                              >
                                <span className="file-type-badge">
                                  {getFileTypeLabel(note)}
                                </span>
                                <span className="file-info">
                                  <strong>{getNoteFileName(note)}</strong>
                                  <small>
                                    {formatFileSize(note.file_size || note.attachment_size)}
                                    {formatFileSize(note.file_size || note.attachment_size) ? " • " : ""}
                                    {isNoteFilePreviewable(note) ? "Open / View" : "Download"}
                                  </small>
                                </span>
                                <span className="file-download-mini">↧</span>
                              </button>

                              {hasText && (
                                <div
                                  className="image-description-text file-description-text"
                                  style={{ "--noteColor": getNoteTextColor(note), color: getNoteTextColor(note) }}
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeNoteHtml(getRenderedNoteHtml(note)),
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {hasText && !hasImage && !hasAttachment && (
                            <div
                              className={`message-text ${
                                titleMessage ? "message-title-text" : ""
                              }`}
                              style={{ "--noteColor": getNoteTextColor(note), color: getNoteTextColor(note) }}
                              dangerouslySetInnerHTML={{
                                __html: sanitizeNoteHtml(getRenderedNoteHtml(note)),
                              }}
                            />
                          )}

                          <div className={`message-time ${note.is_temp ? "message-time-temp" : ""}`}>
                            {formatIndiaTimeOnly(messageDate)}
                          </div>
                        </div>

                        {String(activeMenuId) === String(note.note_id) && !note.is_temp && (
                          <div className="message-action-row" onClick={(e) => e.stopPropagation()}>
                            {hasImage ? (
                              <>
                                <button
                                  className="square-action update-square"
                                  onClick={() => startImageUpdate(note)}
                                >
                                  Image update
                                </button>

                                <button
                                  className="square-action text-square"
                                  onClick={() => startImageCaption(note)}
                                >
                                  Add Text
                                </button>

                                <button
                                  className="square-action download-square"
                                  onClick={(e) => downloadNoteImage(e, note)}
                                >
                                  Download
                                </button>

                                <button
                                  className="square-action view-full-square"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openFullImagePreview(getNoteImageUrl(note));
                                  }}
                                >
                                  View Full Image
                                </button>
                              </>
                            ) : hasAttachment ? (
                              <>
                                <button
                                  className="square-action update-square"
                                  onClick={() => startFileUpdate(note)}
                                >
                                  File
                                </button>

                                <button
                                  className="square-action text-square"
                                  onClick={() => startFileCaption(note)}
                                >
                                  {hasText ? "Text" : "Add Text"}
                                </button>

                                <button
                                  className="square-action download-square"
                                  onClick={(e) => downloadNoteFile(e, note)}
                                >
                                  Download
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="square-action update-square"
                                  onClick={() => startEdit(note)}
                                >
                                  Update
                                </button>

                                <button
                                  className="square-action title-square"
                                  onClick={() => markNoteAsTitle(note)}
                                >
                                  {titleMessage ? "Normal" : "Title"}
                                </button>
                              </>
                            )}

                            <button
                              className="square-action copy-square"
                              onClick={(e) => copyNoteText(e, note)}
                            >
                              Copy
                            </button>

                            {hasText && (
                              <button
                                type="button"
                                className="square-action link-square"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleNoteLink(note);
                                }}
                                title={linkMessage ? "Remove link" : "Make full URL clickable"}
                                aria-label={linkMessage ? "Remove link" : "Make full URL clickable"}
                              >
                                🔗 {linkMessage ? "Unlink" : "Link"}
                              </button>
                            )}

                            <button
                              className={`square-action pin-square ${pinnedMessage ? "active-pin" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinnedNote(note);
                              }}
                            >
                              {pinnedMessage ? "Unpin" : "Pin"}
                            </button>

                            <button
                              className="square-action delete-square"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                preserveChatView(note.note_id);
                                openConfirm(
                                  "Delete?",
                                  "Delete this message?",
                                  () => deleteNote(note.note_id)
                                );
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}

              <div ref={bottomRef}></div>
            </main>

            {fullImagePreview && (
              <div
                className="image-viewer-overlay"
                onClick={closeFullImagePreview}
                role="dialog"
                aria-modal="true"
              >
                <div
                  className="image-viewer-box"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={handleImageViewerTouchStart}
                  onTouchMove={handleImageViewerTouchMove}
                  onTouchEnd={handleImageViewerTouchEnd}
                >
                  <button
                    type="button"
                    className="image-viewer-close"
                    onClick={closeFullImagePreview}
                    aria-label="Close image"
                  >
                    ×
                  </button>
                  <img
                    src={fullImagePreview}
                    alt="Full preview"
                    className="image-viewer-img"
                    onLoad={() => setImageViewerLoading(false)}
                    onError={() => {
                      setImageViewerLoading(false);
                      setImageViewerError(true);
                    }}
                    onDoubleClick={toggleImageViewerZoom}
                    style={{
                      transform: `translate3d(${imageViewerTransform.x}px, ${imageViewerTransform.y}px, 0) scale(${imageViewerTransform.scale})`,
                    }}
                  />
                  {imageViewerLoading && (
                    <div className="image-viewer-loading" role="status" aria-label="Loading image">
                      <span className="image-spinner" />
                    </div>
                  )}
                  {imageViewerError && <div className="image-viewer-error">Image could not be loaded</div>}
                </div>
              </div>
            )}

            {sendingMessage && (
              <div className="sending-message-indicator" role="status">
                <span className="sending-message-dot" /> Sending message
              </div>
            )}

            {previewImages.length > 0 ? (
              <div className="preview-strip multi-image-preview-strip">
                <div className="multi-image-preview-grid">
                  {previewImages.map((url, index) => (
                    <img key={`${url}-${index}`} src={normalizeApiImageUrl(url) || url} alt={`preview ${index + 1}`} />
                  ))}
                </div>
                <span>{previewImages.length} image{previewImages.length > 1 ? "s" : ""} selected</span>
                <button onClick={removeImage}>×</button>
              </div>
            ) : previewImage && (
              <div className="preview-strip">
                <img src={normalizeApiImageUrl(previewImage) || previewImage} alt="preview" />
                <span>{selectedImage ? selectedImage.name : composerMode === "image-update" ? "Current image - select new image" : "Current image"}</span>
                <button onClick={removeImage}>×</button>
              </div>
            )}

            {previewFile && (
              <div className="preview-strip file-preview-strip">
                <div className="preview-file-icon">
                  {getFileTypeLabel(previewFile)}
                </div>
                <span>
                  {selectedFile
                    ? getFilePreviewName()
                    : composerMode === "file-update"
                      ? "Current file - select new file"
                      : getFilePreviewName()}
                  {previewFile?.size ? ` • ${formatFileSize(previewFile.size)}` : ""}
                </span>
                <button onClick={removeFile}>×</button>
              </div>
            )}

            {editingNoteId && (
              <div className="edit-strip">
                <span>{composerMode === "title" ? "Adding title style" : composerMode === "image-update" ? "Updating image" : composerMode === "image-caption" ? "Adding image text" : composerMode === "file-update" ? "Updating file" : composerMode === "file-caption" ? "Adding file text" : "Updating message"}</span>
                <button onClick={resetForm}>Cancel</button>
              </div>
            )}

            <footer className="composer" onClick={(e) => e.stopPropagation()}>
              <div className="composer-card">
                <div className="composer-tools-top">
                  <div
                    className="composer-tools-popover composer-tools-always-visible"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                  >
                      <button
                        type="button"
                        className={`tool-btn format-btn ${activeFormats.bold ? "active" : ""}`}
                        onMouseDown={applyBold}
                        title="Bold"
                      >
                        <b>B</b>
                      </button>

                      <button
                        type="button"
                        className={`tool-btn format-btn ${activeFormats.underline ? "active" : ""}`}
                        onMouseDown={applyUnderline}
                        title="Underline"
                      >
                        <u>U</u>
                      </button>

                      <input
                        ref={colorRef}
                        type="color"
                        value={textColor}
                        hidden
                        onChange={(e) => changeColor(e.target.value)}
                      />

                      <button
                        type="button"
                        className={`tool-btn color-tool ${colorModeActive ? "active" : ""}`}
                        onMouseDown={openColorPicker}
                        title="Text color"
                        style={{ "--pickedColor": textColor }}
                      >
                        <img src={COLOR_ICON} alt="color" className="tool-icon color-icon" />
                      </button>

                      <input
                        ref={imageRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handleImageSelect}
                      />

                      <button
                        type="button"
                        className={`tool-btn image-tool ${previewImage ? "active" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => imageRef.current?.click()}
                        title="Add image"
                      >
                        <img src={ATTACH_ICON} alt="image" className="tool-icon attach-icon" />
                      </button>

                      <input
                        ref={fileRef}
                        type="file"
                        hidden
                        onChange={handleFileSelect}
                      />

                      <button
                        type="button"
                        className={`tool-btn file-tool ${previewFile ? "active" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => fileRef.current?.click()}
                        title="Add file"
                      >
                        <img src={FILE_ICON} alt="file" className="tool-icon file-icon-img" />
                      </button>

                      {!privateChannelLocked && (
                        <button
                          type="button"
                          className={`tool-btn composer-refresh-tool ${manualRefreshing ? "is-refreshing" : ""}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={refreshCurrentPage}
                          title="Refresh messages"
                          aria-label="Refresh messages"
                          disabled={manualRefreshing}
                        >
                          ↻
                        </button>
                      )}
                  </div>
                </div>

                <div className="composer-input-row">
                  <div
                    ref={editorRef}
                    className={`text-input ${composerMode === "title" ? "title-editor-mode" : ""}`}
                    contentEditable
                    data-placeholder={composerMode === "title" ? "Type title..." : composerMode === "image-update" ? "Select new image, then tap send" : composerMode === "image-caption" ? "Add image description..." : composerMode === "file-update" ? "Select new file, then tap send" : composerMode === "file-caption" ? "Add file description..." : "Enter text..."}
                    style={{ "--composerColor": textColor, caretColor: textColor }}
                    onFocus={saveSelection}
                    onMouseUp={saveSelection}
                    onTouchEnd={saveSelection}
                    onKeyUp={saveSelection}
                    onKeyDown={() => {
                      // Keep the explicit toolbar typing mode. Do not query the
                      // browser selection state here, because mobile toolbar
                      // taps can make queryCommandState() temporarily false.
                      saveSelection();
                    }}
                    onInput={saveSelection}
                    onBlur={saveSelection}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData("text/plain");
                      document.execCommand("insertText", false, text);
                      saveSelection();
                    }}
                  ></div>

                  <button
                    className="send-btn"
                    onClick={saveNote}
                    disabled={loading}
                    title="Send"
                  >
                    {loading ? "…" : editingNoteId ? "✓" : "➤"}
                  </button>
                </div>
              </div>
            </footer>
          </>
        )}
      </div>

      {toast.show && (
        <div className="popup-layer">
          <div className={`toast ${toast.type}`}>
            <div className="toast-icon">
              {toast.type === "success" ? "✓" : "!"}
            </div>
            <p>{toast.message}</p>
          </div>
        </div>
      )}

      {confirmBox.show && (
        <div className="confirm-layer">
          <div className="confirm-card">
            <div className="confirm-icon">?</div>
            <h3>{confirmBox.title}</h3>
            <p>{confirmBox.message}</p>

            <div className="confirm-actions">
              <button className="cancel-confirm" onClick={closeConfirm}>
                Cancel
              </button>

              <button
                className="delete-confirm"
                onClick={() => {
                  closeConfirm();
                  confirmBox.action && confirmBox.action();
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap");

        * {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        html,
        body,
        #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        body {
          background: #07111f;
        }

        .nm-screen {
          width: 100vw;
          min-height: 100dvh;
          display: flex;
          justify-content: center;
          align-items: stretch;
          background:
            radial-gradient(circle at 0% 0%, rgba(20, 184, 166, 0.32), transparent 32%),
            radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.25), transparent 34%),
            linear-gradient(145deg, #020617, #0f172a 48%, #0f766e);
          font-family: Inter, Arial, sans-serif;
          overflow: hidden;
        }

        .nm-phone {
          width: 100vw;
          max-width: 430px;
          height: 100dvh;
          background: #e9f3ef;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .nm-header {
          min-height: 70px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: max(9px, env(safe-area-inset-top)) 10px 10px;
          background:
            radial-gradient(circle at 92% 9%, rgba(255, 255, 255, 0.24), transparent 28%),
            linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.22);
          z-index: 30;
        }

        .header-icon-btn {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 12px;
          background: rgba(255,255,255,0.14);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
        }

        .back-btn {
          font-size: 31px;
          line-height: 1;
          padding-bottom: 3px;
        }

        .search-btn {
          font-size: 15px;
        }

        .search-btn.active {
          background: rgba(255,255,255,0.26);
        }

        .header-logo {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(135deg, #14b8a6, #2563eb);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 900;
          flex-shrink: 0;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.2);
        }

        .header-logo img,
        .unlock-logo img,
        .preview-strip img,
        .message-image {
          display: block;
        }

        .header-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .header-title {
          flex: 1;
          min-width: 0;
        }

        .header-title h2 {
          margin: 0;
          color: white;
          font-size: 17px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: 0.1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-title p {
          margin: 3px 0 0;
          color: rgba(255,255,255,0.86);
          font-size: 11px;
          line-height: 1.2;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-box {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(255,255,255,0.96);
          border-bottom: 1px solid rgba(226,232,240,0.95);
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
          z-index: 24;
        }

        .search-box span {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #ecfeff;
          font-size: 13px;
          flex-shrink: 0;
        }

        .search-box input {
          flex: 1;
          min-width: 0;
          height: 38px;
          border: 1px solid #dbe4f0;
          border-radius: 16px;
          outline: none;
          padding: 0 13px;
          background: #f8fafc;
          color: #0f172a;
          font-size: 14px;
          font-weight: 700;
        }

        .search-box input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
        }

        .search-box button {
          width: 31px;
          height: 31px;
          border: none;
          border-radius: 11px;
          background: #e2e8f0;
          color: #475569;
          font-size: 19px;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
        }

        .chat-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 11px 9px 12px;
          background:
            radial-gradient(circle at 10% 8%, rgba(255,255,255,0.72), transparent 27%),
            radial-gradient(circle at 92% 92%, rgba(14,165,233,0.18), transparent 31%),
            linear-gradient(135deg, #e7f8ef, #f6fbff 48%, #e8efff);
          scroll-behavior: smooth;
        }

        .chat-body::-webkit-scrollbar {
          width: 4px;
        }

        .chat-body::-webkit-scrollbar-thumb {
          background: rgba(15, 118, 110, 0.34);
          border-radius: 999px;
        }

        .empty-card {
          width: fit-content;
          max-width: 82%;
          margin: 92px auto 0;
          padding: 19px 21px;
          border-radius: 24px;
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.72);
          box-shadow: 0 18px 45px rgba(15,23,42,0.11);
          text-align: center;
          backdrop-filter: blur(12px);
        }

        .empty-icon {
          width: 47px;
          height: 47px;
          margin: 0 auto 10px;
          border-radius: 18px;
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 900;
        }

        .empty-card h3 {
          margin: 0 0 6px;
          color: #0f172a;
          font-size: 16px;
          font-weight: 900;
        }

        .empty-card p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .note-block {
          width: 100%;
        }

        .date-separator {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 9px 0 12px;
          width: 100%;
          pointer-events: none;
        }

        .date-separator span {
          min-height: 27px;
          max-width: calc(100vw - 40px);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 13px;
          border-radius: 999px;
          color: white;
          background: linear-gradient(135deg, var(--badge1), var(--badge2));
          font-size: 11.5px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 24px rgba(15,23,42,0.16);
          white-space: nowrap;
        }

        .message-line {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin: 0 0 8px;
          animation: msgIn 0.18s ease;
          position: relative;
        }

        .message-line.my-message-line {
          align-items: flex-end;
        }

        .message-line.other-message-line {
          align-items: flex-start;
        }

        .message-active {
          z-index: 10;
        }

        @keyframes msgIn {
          from {
            opacity: 0;
            transform: translateY(7px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .message-bubble {
          width: fit-content;
          max-width: min(82%, 342px);
          min-width: 54px;
          position: relative;
          padding: 7px 31px 18px 10px;
          border-radius: 7px 18px 18px 18px;
          background: rgba(255,255,255,0.98);
          border: 1px solid rgba(226,232,240,0.86);
          color: #0f172a;
          box-shadow: 0 7px 20px rgba(15,23,42,0.10);
          word-break: break-word;
          overflow-wrap: anywhere;
          backdrop-filter: blur(12px);
        }

        .message-bubble::before {
          content: "";
          position: absolute;
          left: -5px;
          top: -1px;
          width: 0;
          height: 0;
          border-top: 10px solid rgba(255,255,255,0.98);
          border-left: 8px solid transparent;
        }

        .message-bubble.my-message-bubble {
          border-radius: 18px 7px 18px 18px;
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          border-color: rgba(22, 163, 74, 0.28);
          box-shadow: 0 8px 22px rgba(22, 163, 74, 0.12);
        }

        .message-bubble.my-message-bubble::before {
          left: auto;
          right: -5px;
          border-left: 0;
          border-right: 8px solid transparent;
          border-top-color: #dcfce7;
        }

        .message-bubble.other-message-bubble {
          background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
          border-color: rgba(37, 99, 235, 0.18);
        }

        .message-bubble.other-message-bubble::before {
          border-top-color: #ffffff;
        }

        .message-bubble.my-message-bubble .message-time {
          color: #047857;
        }

        .message-bubble.other-message-bubble .message-time {
          color: #2563eb;
        }

        .message-bubble.image-only {
          padding: 5px 29px 18px 5px;
          min-width: 70px;
          max-width: min(84%, 312px);
        }

        .message-dot-btn {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 9px;
          background: rgba(241,245,249,0.9);
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
          z-index: 3;
        }

        .message-dot-btn:hover,
        .message-dot-btn:focus {
          background: #e2e8f0;
          outline: none;
        }

        .message-link {
          color: #2563eb !important;
          text-decoration: underline !important;
          text-decoration-thickness: 1.5px !important;
          text-underline-offset: 2px !important;
          cursor: pointer !important;
          display: inline !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
          white-space: normal !important;
          user-select: text !important;
          -webkit-user-select: text !important;
          pointer-events: auto !important;
        }

        .message-link:hover {
          color: #1d4ed8 !important;
        }

        .message-bubble:has(.message-link-badge) {
          padding-top: 29px !important;
        }

        .message-text {
          max-width: 100%;
          padding-right: 2px;
          color: #111111;
          font-size: 15.5px;
          line-height: 1.42;
          font-weight: 650;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .message-text div,
        .message-text p {
          margin: 0;
        }

        .message-text strong,
        .message-text b {
          font-weight: 900;
        }

        .message-text u {
          text-underline-offset: 3px;
        }

        .message-image {
          width: auto;
          max-width: min(264px, 70vw);
          max-height: 310px;
          object-fit: contain;
          border-radius: 14px;
          border: 1px solid rgba(226,232,240,0.86);
          box-shadow: 0 6px 16px rgba(15,23,42,0.10);
          background: #f8fafc;
        }

        .message-time {
          position: absolute;
          right: 8px;
          bottom: 4px;
          display: flex;
          align-items: center;
          gap: 3px;
          color: #64748b;
          font-size: 9.8px;
          line-height: 1;
          font-weight: 900;
          white-space: nowrap;
          user-select: none;
        }

        .message-action-row {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 6px;
          padding-left: 4px;
          max-width: 100%;
          flex-wrap: wrap;
          animation: actionsIn 0.15s ease;
        }

        @keyframes actionsIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .square-action {
          height: 34px;
          min-width: 86px;
          border: 1px solid transparent;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 22px rgba(15,23,42,0.10);
        }

        .update-square {
          color: #1d4ed8;
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .delete-square {
          color: #dc2626;
          background: #fff1f2;
          border-color: #fecdd3;
        }

        .link-square {
          color: #7c3aed;
          background: #f5f3ff;
          border-color: #ddd6fe;
        }

        .download-square {
          color: #047857;
          background: #ecfdf5;
          border-color: #a7f3d0;
        }

        .preview-strip {
          flex-shrink: 0;
          z-index: 23;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 10px;
          background: rgba(255,255,255,0.98);
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -8px 22px rgba(15,23,42,0.06);
        }

        .preview-strip img {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid #dbe4f0;
          flex-shrink: 0;
        }

        .preview-strip span {
          flex: 1;
          min-width: 0;
          color: #475569;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .preview-strip button {
          width: 29px;
          height: 29px;
          border: none;
          border-radius: 10px;
          background: #fee2e2;
          color: #dc2626;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
        }

        .edit-strip {
          flex-shrink: 0;
          z-index: 23;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 7px 10px;
          background: #eff6ff;
          color: #2563eb;
          border-top: 1px solid #bfdbfe;
          font-size: 13px;
          font-weight: 900;
        }

        .edit-strip button {
          height: 31px;
          border: none;
          border-radius: 11px;
          padding: 0 12px;
          background: #2563eb;
          color: white;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .composer {
          flex-shrink: 0;
          z-index: 25;
          padding: 8px;
          padding-bottom: max(8px, env(safe-area-inset-bottom));
          background: rgba(255,255,255,0.98);
          border-top: 1px solid rgba(226,232,240,0.95);
          box-shadow: 0 -10px 28px rgba(15,23,42,0.09);
        }

        .composer-card {
          width: 100%;
          border: 1px solid #dbe4f0;
          border-radius: 20px;
          background: #f8fafc;
          padding: 6px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.92);
        }

        .composer-tools {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }

        .tool-left {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .tool-btn {
          width: 31px;
          height: 31px;
          border: 1px solid #dbe4f0;
          border-radius: 11px;
          background: #ffffff;
          color: #334155;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(15,23,42,0.05);
        }

        .tool-btn:active,
        .send-btn:active,
        .square-action:active {
          transform: scale(0.98);
        }

        .color-tool {
          color: var(--pickedColor);
          border-bottom: 3px solid var(--pickedColor);
          font-family: Georgia, serif;
          font-size: 15px;
        }

        .send-btn {
          width: 41px;
          height: 34px;
          border: none;
          border-radius: 13px;
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 8px 18px rgba(14,165,233,0.28);
        }

        .send-btn:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .text-input {
          width: 100%;
          min-height: 42px;
          max-height: 108px;
          overflow-y: auto;
          overflow-x: hidden;
          outline: none;
          border: 1px solid #dbe4f0;
          border-radius: 16px;
          background: white;
          color: #111111;
          padding: 10px 12px;
          font-size: 15px;
          line-height: 1.38;
          font-weight: 650;
          word-break: break-word;
          overflow-wrap: anywhere;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .text-input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
        }

        .text-input:empty::before {
          content: attr(data-placeholder);
          color: rgba(15, 23, 42, 0.42);
          font-weight: 700;
          letter-spacing: 0.1px;
          pointer-events: none;
        }

        .text-input::-webkit-scrollbar {
          width: 3px;
        }

        .text-input::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        .unlock-screen {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          background:
            radial-gradient(circle at top, rgba(14,165,233,0.24), transparent 36%),
            radial-gradient(circle at bottom right, rgba(20,184,166,0.20), transparent 32%),
            linear-gradient(135deg, #e2f8ed, #f4f8ff 48%, #e5ebff);
        }

        .unlock-card {
          width: 100%;
          max-width: 330px;
          padding: 26px 18px 18px;
          border-radius: 29px;
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(226,232,240,0.9);
          box-shadow: 0 28px 80px rgba(15,23,42,0.22);
          text-align: center;
          backdrop-filter: blur(18px);
          animation: unlockPop 0.22s ease;
        }

        @keyframes unlockPop {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .unlock-logo {
          width: 76px;
          height: 76px;
          margin: 0 auto 11px;
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 900;
          box-shadow: 0 18px 35px rgba(14,165,233,0.28);
        }

        .unlock-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .unlock-lock {
          width: 46px;
          height: 46px;
          margin: -4px auto 11px;
          border-radius: 50%;
          background: #dbeafe;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 10px 22px rgba(37,99,235,0.14);
        }

        .unlock-card h3 {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
          font-weight: 900;
        }

        .unlock-card p {
          margin: 9px 0 13px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.42;
          font-weight: 700;
        }

        .unlock-card p b {
          color: #0f766e;
        }

        .unlock-tagline {
          max-width: 250px;
          margin: 0 auto 13px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #ecfeff;
          color: #0f766e;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .center-pin-input {
          width: 154px;
          height: 52px;
          display: block;
          margin: 4px auto 10px;
          border: 1px solid #cbd5e1;
          border-radius: 17px;
          background: white;
          color: #0f172a;
          outline: none;
          text-align: center;
          font-size: 24px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 7px;
          padding-left: 7px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .center-pin-input:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.14);
        }

        .unlock-error {
          margin-bottom: 10px;
          color: #dc2626;
          font-size: 12px;
          font-weight: 900;
        }

        .unlock-open-btn {
          width: 100%;
          height: 44px;
          border: none;
          border-radius: 15px;
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: white;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(14,165,233,0.28);
        }

        .unlock-open-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .unlock-back-btn {
          width: 100%;
          height: 38px;
          margin-top: 8px;
          border: none;
          border-radius: 14px;
          background: #f1f5f9;
          color: #475569;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .popup-layer {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .toast {
          width: min(245px, calc(100vw - 40px));
          padding: 20px 16px;
          border-radius: 24px;
          background: white;
          box-shadow: 0 24px 80px rgba(15,23,42,0.3);
          text-align: center;
          animation: popupScale 0.16s ease;
        }

        .toast-icon {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
          font-weight: 900;
        }

        .toast.success .toast-icon {
          background: #dcfce7;
          color: #16a34a;
        }

        .toast.error .toast-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .toast p {
          margin: 0;
          color: #1f2937;
          font-size: 14px;
          font-weight: 900;
        }

        .confirm-layer {
          position: fixed;
          inset: 0;
          z-index: 110;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(15,23,42,0.52);
          backdrop-filter: blur(6px);
        }

        .confirm-card {
          width: 100%;
          max-width: 330px;
          padding: 23px 18px 18px;
          border-radius: 26px;
          background: white;
          box-shadow: 0 28px 90px rgba(15,23,42,0.38);
          text-align: center;
          animation: popupScale 0.16s ease;
        }

        @keyframes popupScale {
          from {
            transform: scale(0.92);
            opacity: 0;
          }

          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .confirm-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #fee2e2;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          font-size: 26px;
          font-weight: 900;
        }

        .confirm-card h3 {
          margin: 0;
          color: #111827;
          font-size: 20px;
        }

        .confirm-card p {
          margin: 9px 0 18px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.4;
        }

        .confirm-actions {
          display: flex;
          gap: 10px;
        }

        .confirm-actions button {
          flex: 1;
          height: 42px;
          border: none;
          border-radius: 15px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .cancel-confirm {
          background: #f1f5f9;
          color: #475569;
        }

        .delete-confirm {
          background: #dc2626;
          color: white;
        }



        .message-bubble {
          max-width: min(96%, 398px);
          padding: 7px 30px 18px 10px;
        }

        .message-bubble.image-only {
          max-width: min(96%, 392px);
        }

        .title-bubble {
          background: linear-gradient(135deg, #fff7ed, #ffffff 58%, #f0f9ff);
          border-color: #fed7aa;
          box-shadow: 0 10px 26px rgba(249, 115, 22, 0.12);
        }

        .message-title-text {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 20px;
          line-height: 1.28;
          font-weight: 900;
          letter-spacing: 0.15px;
          color: #0f172a !important;
          padding-right: 2px;
        }

        .message-title-text::before {
          content: "Title";
          display: inline-flex;
          vertical-align: middle;
          margin: 0 7px 4px 0;
          padding: 3px 7px;
          border-radius: 8px;
          background: #ffedd5;
          color: #ea580c;
          font-family: Inter, Arial, sans-serif;
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .image-description-text {
          margin-top: 7px;
          padding: 8px 9px 2px;
          border-top: 1px solid #e2e8f0;
          font-size: 14.5px;
          line-height: 1.42;
          font-weight: 650;
          color: #334155;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .image-description-text::before {
          content: "Description";
          display: block;
          margin-bottom: 3px;
          color: #0f766e;
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.45px;
          text-transform: uppercase;
        }

        .image-description-text div,
        .image-description-text p {
          margin: 0;
        }

        .message-image {
          max-width: min(330px, 86vw);
          max-height: 420px;
        }

        .message-action-row {
          gap: 5px;
          margin-top: 5px;
          padding-left: 2px;
          flex-wrap: nowrap;
          overflow-x: auto;
          max-width: 100%;
          scrollbar-width: none;
        }

        .message-action-row::-webkit-scrollbar {
          display: none;
        }

        .square-action {
          height: 27px;
          min-width: auto;
          border-radius: 8px;
          padding: 0 8px;
          font-size: 10.5px;
          line-height: 1;
          box-shadow: 0 5px 14px rgba(15,23,42,0.09);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .text-square {
          color: #0f766e;
          background: #ecfdf5;
          border-color: #a7f3d0;
        }

        .title-square {
          color: #ea580c;
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .update-square:hover,
        .text-square:hover,
        .title-square:hover,
        .delete-square:hover {
          transform: translateY(-1px);
          filter: brightness(0.98);
        }

        .tool-btn {
          position: relative;
          transition: all 0.16s ease;
        }

        .tool-btn:hover,
        .tool-btn.active {
          background: #fff7ed;
          color: #f97316;
          border-color: #fdba74;
          box-shadow: 0 7px 18px rgba(249,115,22,0.16);
        }

        .format-btn {
          font-size: 14px;
        }

        .tool-icon {
          display: block;
          object-fit: contain;
          pointer-events: none;
        }

        .attach-icon {
          width: 16px;
          height: 18px;
        }

        .color-icon {
          width: 22px;
          height: 22px;
        }

        .color-tool {
          border-bottom: 1px solid #dbe4f0;
          overflow: hidden;
        }

        .color-tool::after {
          content: "";
          position: absolute;
          left: 7px;
          right: 7px;
          bottom: 3px;
          height: 3px;
          border-radius: 99px;
          background: var(--pickedColor);
        }

        .edit-strip span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }



        /* Final compact message view: almost no card, full visible text/image */
        .message-line {
          margin: 0 0 7px;
          align-items: flex-start;
        }

        .message-bubble {
          width: fit-content;
          max-width: min(97%, 405px);
          min-width: 42px;
          padding: 3px 27px 13px 5px;
          border-radius: 6px 13px 13px 13px;
          background: rgba(255,255,255,0.38);
          border: 1px solid rgba(255,255,255,0.42);
          box-shadow: none;
          backdrop-filter: none;
          overflow: visible;
        }

        .message-bubble::before {
          display: none;
        }

        .message-bubble.image-only,
        .message-bubble:has(.message-image) {
          max-width: min(97%, 405px);
          padding: 0 25px 13px 0;
          background: transparent;
          border-color: transparent;
          border-radius: 0;
        }

        .message-text {
          font-size: 15.5px;
          line-height: 1.42;
          font-weight: 650;
          padding: 2px 0 0;
          max-width: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .message-image {
          width: auto;
          max-width: min(374px, 91vw);
          max-height: 58dvh;
          object-fit: contain;
          border-radius: 13px;
          border: none;
          box-shadow: none;
          background: transparent;
        }

        .image-description-text {
          margin-top: 0;
          width: fit-content;
          max-width: min(374px, 91vw);
          padding: 7px 10px 8px;
          border-top: none;
          border-radius: 0 0 13px 13px;
          background: rgba(255,255,255,0.58);
          color: #334155;
          font-size: 14.3px;
          line-height: 1.42;
          font-weight: 650;
          box-shadow: none;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .message-image + .image-description-text,
        .image-description-text {
          transform: translateY(-1px);
        }

        .image-description-text::before {
          content: "Description";
          display: block;
          margin-bottom: 3px;
          color: #0f766e;
          font-size: 8.8px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.45px;
          text-transform: uppercase;
        }

        .message-time {
          right: 5px;
          bottom: 2px;
          padding: 1px 3px;
          border-radius: 6px;
          background: rgba(255,255,255,0.55);
          color: #64748b;
          font-size: 9.4px;
        }

        .message-bubble:has(.message-image) .message-time {
          right: 0;
          bottom: 0;
          background: rgba(15,23,42,0.45);
          color: white;
          backdrop-filter: blur(6px);
        }

        .message-dot-btn {
          top: 0;
          right: 0;
          width: 22px;
          height: 22px;
          border-radius: 7px;
          background: rgba(255,255,255,0.56);
          color: #475569;
          font-size: 15px;
          box-shadow: none;
        }

        .message-bubble:has(.message-image) .message-dot-btn {
          background: rgba(15,23,42,0.38);
          color: white;
          backdrop-filter: blur(6px);
        }

        .title-bubble {
          max-width: min(97%, 405px);
          padding: 7px 27px 13px 10px;
          background: transparent;
          border: none;
          border-left: 4px solid #f97316;
          border-radius: 0 13px 13px 0;
          box-shadow: none;
        }

        .message-title-text {
          font-family: "Playfair Display", Georgia, "Times New Roman", serif;
          font-size: 21px;
          line-height: 1.22;
          font-weight: 500;
          letter-spacing: 0.1px;
          color: #111827 !important;
          padding: 0;
        }

        .message-title-text::before {
          content: "TITLE";
          display: block;
          width: fit-content;
          margin: 0 0 4px;
          padding: 3px 7px;
          border-radius: 6px;
          background: #fff7ed;
          color: #ea580c;
          font-family: Inter, Arial, sans-serif;
          font-size: 8.5px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.7px;
          text-transform: uppercase;
        }

        .message-action-row {
          gap: 4px;
          margin-top: 3px;
          padding-left: 1px;
          flex-wrap: nowrap;
          overflow-x: auto;
          max-width: 100%;
          scrollbar-width: none;
        }

        .message-action-row::-webkit-scrollbar {
          display: none;
        }

        .square-action {
          height: 24px;
          min-width: 54px;
          border-radius: 7px;
          padding: 0 7px;
          font-size: 9.5px;
          line-height: 1;
          box-shadow: none;
          flex-shrink: 0;
        }

        @media (max-width: 370px) {
          .message-bubble,
          .message-bubble.image-only,
          .message-bubble:has(.message-image),
          .title-bubble {
            max-width: 98%;
          }

          .message-image,
          .image-description-text {
            max-width: min(320px, 90vw);
          }

          .message-text {
            font-size: 15px;
          }

          .message-title-text {
            font-size: 19.5px;
          }
        }

        @media (min-width: 431px) {
          .nm-screen {
            align-items: center;
            padding: 18px;
          }

          .nm-phone {
            width: 430px;
            height: 92dvh;
            border-radius: 26px;
            box-shadow: 0 34px 100px rgba(0,0,0,0.42);
          }
        }

        @media (max-width: 370px) {
          .nm-header {
            gap: 7px;
            padding-left: 8px;
            padding-right: 8px;
          }

          .header-icon-btn {
            width: 31px;
            height: 31px;
            border-radius: 11px;
          }

          .back-btn {
            font-size: 28px;
          }

          .header-logo {
            width: 41px;
            height: 41px;
            border-radius: 14px;
          }

          .header-title h2 {
            font-size: 15.5px;
          }

          .header-title p {
            font-size: 10.5px;
          }

          .chat-body {
            padding-left: 7px;
            padding-right: 7px;
          }

          .message-bubble {
            max-width: 96%;
            padding-right: 30px;
          }

          .message-image {
            max-width: min(300px, 86vw);
          }

          .tool-btn {
            width: 29px;
            height: 29px;
            font-size: 12px;
          }

          .send-btn {
            width: 38px;
            height: 32px;
          }

          .tool-left {
            gap: 5px;
          }

          .composer {
            padding-left: 7px;
            padding-right: 7px;
          }

          .square-action {
            min-width: auto;
            height: 26px;
            font-size: 10px;
            padding: 0 7px;
          }

          .unlock-card {
            padding: 24px 16px 18px;
          }

          .center-pin-input {
            width: 145px;
            letter-spacing: 6px;
          }
        }

        /* Final correction: compact cards, tiny corner time, fixed bold behavior display, image caption equals image width */
        .note-block {
          margin-bottom: 2px;
        }

        .message-line {
          margin: 0 0 10px;
          padding-right: 3px;
        }

        .message-active {
          z-index: 30;
        }

        .message-bubble {
          width: fit-content;
          max-width: min(96%, 402px);
          min-width: 52px;
          padding: 5px 24px 15px 8px;
          border-radius: 6px 12px 12px 12px;
          background: rgba(255, 255, 255, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.46);
          box-shadow: none;
          color: #0f172a;
          overflow: visible;
          position: relative;
        }

        .message-bubble::before {
          display: none;
        }

        .message-bubble.image-only,
        .message-bubble:has(.image-message-wrap) {
          max-width: min(96%, 402px);
          padding: 0 24px 14px 0;
          background: transparent;
          border-color: transparent;
          border-radius: 0;
          min-width: 88px;
        }

        .message-text {
          max-width: 100%;
          padding: 1px 0 0;
          font-family: Inter, Arial, sans-serif;
          font-size: 15.6px;
          line-height: 1.43;
          font-weight: 500;
          letter-spacing: 0;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .message-text strong,
        .message-text b,
        .message-text span[style*="font-weight: bold"],
        .message-text span[style*="font-weight: 700"],
        .message-text span[style*="font-weight: 800"],
        .message-text span[style*="font-weight: 900"] {
          font-weight: 900 !important;
        }

        .message-text u {
          text-underline-offset: 3px;
        }

        .image-message-wrap {
          display: block;
          width: fit-content;
          max-width: min(372px, calc(100vw - 40px));
          overflow: visible;
        }

        .message-image {
          display: block;
          width: auto;
          max-width: 100%;
          max-height: 58dvh;
          object-fit: contain;
          border-radius: 13px;
          border: none;
          box-shadow: none;
          background: transparent;
        }

        .image-description-text {
          display: block;
          width: 100%;
          max-width: 100%;
          margin-top: 0;
          padding: 7px 9px 8px;
          border-radius: 0 0 13px 13px;
          border-top: 1px solid rgba(226, 232, 240, 0.72);
          background: rgba(255, 255, 255, 0.62);
          font-family: Inter, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.42;
          font-weight: 500;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .image-description-text::before {
          content: "Description";
          display: block;
          margin: 0 0 4px;
          color: #0f766e;
          font-size: 8.5px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.45px;
          text-transform: uppercase;
        }

        .image-description-text strong,
        .image-description-text b,
        .image-description-text span[style*="font-weight: bold"] {
          font-weight: 900 !important;
        }

        .message-time {
          position: absolute;
          right: 5px;
          bottom: 3px;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 1px 3px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.56);
          color: #64748b;
          font-size: 7.8px;
          line-height: 1;
          font-weight: 900;
          white-space: nowrap;
          pointer-events: none;
        }

        .message-bubble:has(.image-message-wrap) .message-time {
          right: 3px;
          bottom: 3px;
          background: rgba(15, 23, 42, 0.52);
          color: #ffffff;
          backdrop-filter: blur(6px);
        }

        .message-dot-btn {
          top: 0;
          right: 0;
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.58);
          color: #475569;
          font-size: 14px;
          box-shadow: none;
        }

        .message-dot-btn:hover,
        .message-dot-btn:focus {
          background: #fff7ed;
          color: #f97316;
        }

        .message-bubble:has(.image-message-wrap) .message-dot-btn {
          background: rgba(15, 23, 42, 0.42);
          color: #ffffff;
          backdrop-filter: blur(6px);
        }

        .message-action-row {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          margin-bottom: 3px;
          padding-left: 2px;
          max-width: 100%;
          flex-wrap: nowrap;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .message-action-row::-webkit-scrollbar {
          display: none;
        }

        .square-action {
          height: 22px;
          min-width: 46px;
          padding: 0 6px;
          border-radius: 6px;
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          box-shadow: none;
          flex-shrink: 0;
        }

        .title-bubble {
          max-width: min(94%, 392px);
          min-width: 78px;
          padding: 6px 24px 15px 10px;
          background: rgba(255, 247, 237, 0.48);
          border: 1px solid rgba(254, 215, 170, 0.62);
          border-left: 4px solid #f97316;
          border-radius: 0 12px 12px 0;
          box-shadow: none;
        }

        .message-title-text {
          font-family: "Palatino Linotype", "Book Antiqua", Cambria, Georgia, serif;
          font-size: 18.5px;
          line-height: 1.22;
          font-weight: 900;
          letter-spacing: 0.15px;
          color: #c2410c !important;
          padding: 0;
        }

        .message-title-text::before {
          content: "Title";
          display: block;
          width: fit-content;
          margin: 0 0 3px;
          padding: 2px 6px;
          border-radius: 6px;
          background: #ffedd5;
          color: #ea580c;
          font-family: Inter, Arial, sans-serif;
          font-size: 8px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.65px;
          text-transform: uppercase;
        }

        .tool-btn:hover,
        .tool-btn.active {
          background: #fff7ed;
          color: #f97316;
          border-color: #fdba74;
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.14);
        }

        @media (max-width: 370px) {
          .message-bubble,
          .message-bubble.image-only,
          .message-bubble:has(.image-message-wrap),
          .title-bubble {
            max-width: 97%;
          }

          .image-message-wrap {
            max-width: min(330px, calc(100vw - 34px));
          }

          .message-text {
            font-size: 15px;
          }

          .message-title-text {
            font-size: 17.5px;
          }

          .message-time {
            font-size: 7.4px;
          }
        }

        /* ===== Full screen Telegram/WhatsApp style fixed responsive page ===== */
        html,
        body,
        #root {
          width: 100%;
          height: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        .nm-screen {
          width: 100vw;
          height: 100dvh;
          min-height: 100dvh;
          display: block;
          background: #efeae2;
          overflow: hidden;
        }

        .nm-phone {
          width: 100vw;
          max-width: none;
          height: 100dvh;
          min-height: 100dvh;
          margin: 0;
          border-radius: 0;
          background: #efeae2;
          overflow: hidden;
        }

        .nm-header {
          min-height: 64px;
          padding: max(8px, env(safe-area-inset-top)) 10px 8px;
          gap: 9px;
          background: #008069;
          box-shadow: none;
        }

        .header-icon-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 50%;
          background: transparent;
          box-shadow: none;
        }

        .back-btn {
          font-size: 38px;
          font-weight: 300;
        }

        .search-btn {
          font-size: 18px;
        }

        .header-logo {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #e2e8f0;
          box-shadow: none;
        }

        .header-title h2 {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0;
        }

        .header-title p {
          margin-top: 2px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.72);
        }

        .chat-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px 8px 12px;
          background-color: #d9f0c7;
          background-image:
            radial-gradient(circle at 20px 24px, rgba(0, 0, 0, 0.035) 1.5px, transparent 2px),
            radial-gradient(circle at 78px 54px, rgba(0, 0, 0, 0.03) 1.2px, transparent 2px),
            linear-gradient(0deg, rgba(255,255,255,0.28), rgba(255,255,255,0.28));
          background-size: 105px 105px, 130px 130px, auto;
          scroll-behavior: smooth;
        }

        .date-separator {
          margin: 8px 0 10px;
        }

        .date-separator span {
          min-height: 24px;
          padding: 4px 11px;
          border-radius: 9px;
          color: #ffffff;
          background: rgba(96, 137, 82, 0.72);
          box-shadow: none;
          font-size: 12px;
          font-weight: 700;
        }

        .message-line {
          align-items: flex-start;
          margin: 0 0 6px;
        }

        .message-bubble {
          width: fit-content;
          max-width: min(78vw, 640px);
          min-width: 56px;
          padding: 7px 68px 18px 10px;
          border: none;
          border-radius: 0 8px 8px 8px;
          background: #ffffff;
          color: #111827;
          box-shadow: 0 1px 0.5px rgba(11, 20, 26, 0.13);
          backdrop-filter: none;
          overflow: visible;
        }

        .message-bubble::before {
          left: -7px;
          top: 0;
          border-top: 8px solid #ffffff;
          border-left: 8px solid transparent;
        }

        .message-dot-btn {
          top: 2px;
          right: 2px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.65);
          color: #667781;
          font-size: 16px;
          opacity: 0.8;
        }

        .message-text,
        .image-description-text {
          max-width: 100%;
          padding: 0;
          color: #111827;
          font-size: 16px;
          line-height: 1.36;
          font-weight: 500;
          word-break: break-word;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .message-text div,
        .message-text p,
        .image-description-text div,
        .image-description-text p {
          margin: 0;
        }

        .message-time {
          position: absolute;
          right: 7px;
          bottom: 4px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: #8696a0;
          font-size: 10.5px;
          line-height: 1;
          font-weight: 500;
          white-space: nowrap;
          user-select: none;
        }

        .image-message-wrap {
          width: fit-content;
          max-width: min(330px, calc(100vw - 34px));
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .whatsapp-image-frame {
          position: relative;
          width: fit-content;
          max-width: min(330px, calc(100vw - 34px));
          overflow: hidden;
          border-radius: 6px;
          background: #111827;
        }

        .whatsapp-image-frame .message-image {
          opacity: 0.78;
          filter: saturate(0.85) contrast(0.96);
        }

        .message-bubble:has(.image-message-wrap) {
          padding: 4px 4px 19px 4px;
          max-width: min(82vw, 340px);
        }

        .message-bubble:has(.image-message-wrap.with-description) {
          padding: 4px 10px 19px 4px;
        }

        .message-bubble.image-only {
          padding: 4px 4px 19px 4px;
          max-width: min(82vw, 340px);
          min-width: 90px;
        }

        .message-image {
          width: 100%;
          max-width: min(330px, calc(100vw - 34px));
          max-height: 420px;
          height: auto;
          display: block;
          object-fit: contain;
          border: none;
          border-radius: 6px;
          box-shadow: none;
          background: #f8fafc;
        }

        .image-only .message-time {
          right: 8px;
          bottom: 7px;
          padding: 3px 6px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.38);
          color: #ffffff;
          font-size: 10px;
        }

        .message-action-row {
          margin-top: 5px;
          padding-left: 1px;
        }

        .composer {
          padding: 6px 8px;
          padding-bottom: max(6px, env(safe-area-inset-bottom));
          background: #f0f2f5;
          border-top: 1px solid rgba(0,0,0,0.06);
          box-shadow: none;
        }

        .composer-card {
          border: none;
          border-radius: 18px;
          background: #ffffff;
          padding: 5px;
          box-shadow: none;
        }

        .text-input {
          min-height: 38px;
          max-height: 120px;
          border: none;
          border-radius: 16px;
          padding: 9px 11px;
          font-size: 16px;
          font-weight: 500;
          box-shadow: none;
        }

        .text-input:focus {
          border: none;
          box-shadow: none;
        }

        @media (min-width: 768px) {
          .message-bubble {
            max-width: min(64vw, 760px);
          }

          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only {
            max-width: min(48vw, 420px);
          }

          .image-message-wrap,
          .message-image {
            max-width: min(420px, 48vw);
          }
        }

        @media (max-width: 370px) {
          .message-bubble {
            max-width: 88vw;
            padding-right: 62px;
          }

          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only {
            max-width: calc(100vw - 22px);
          }

          .image-message-wrap,
          .message-image {
            max-width: calc(100vw - 30px);
          }
        }


        /* ===== Final image fix: bigger WhatsApp-style images, proper logo, no tiny display ===== */
        .header-logo,
        .unlock-logo {
          background: #ffffff;
        }

        .header-logo img,
        .unlock-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }


        .logo-fallback-letter {
          position: absolute;
          inset: 0;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f766e;
          font-size: 18px;
          font-weight: 900;
        }

        .header-logo,
        .unlock-logo {
          position: relative;
        }

        .header-logo img,
        .unlock-logo img {
          position: relative;
          z-index: 2;
        }

        .header-logo.logo-load-failed img,
        .unlock-logo.logo-load-failed img {
          display: none !important;
        }

        .message-bubble:has(.image-message-wrap),
        .message-bubble.image-only {
          width: fit-content;
          max-width: calc(100vw - 14px);
          padding: 3px 3px 21px 3px;
          border-radius: 7px 13px 13px 13px;
          background: #ffffff;
        }

        .image-message-wrap,
        .whatsapp-image-frame {
          width: min(96vw, 430px);
          max-width: calc(100vw - 14px);
        }

        .whatsapp-image-frame {
          position: relative;
          overflow: hidden;
          border-radius: 7px;
          background: #111827;
        }

        .whatsapp-image-frame .message-image,
        .message-image {
          width: 100%;
          height: auto;
          max-width: 100%;
          max-height: none;
          display: block;
          object-fit: contain;
          border: none;
          border-radius: 7px;
          box-shadow: none;
          background: #f8fafc;
        }

        .whatsapp-image-frame .message-image {
          opacity: 0.82;
          filter: saturate(0.9) contrast(0.96);
        }

        .message-bubble:has(.image-message-wrap) .message-time,
        .image-only .message-time {
          right: 8px;
          bottom: 6px;
          padding: 3px 7px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.42);
          color: #ffffff;
          font-size: 10px;
        }

        @media (min-width: 768px) {
          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only {
            max-width: min(72vw, 540px);
          }

          .image-message-wrap,
          .whatsapp-image-frame {
            width: min(72vw, 540px);
            max-width: min(72vw, 540px);
          }
        }

        @media (max-width: 370px) {
          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only,
          .image-message-wrap,
          .whatsapp-image-frame {
            width: calc(100vw - 12px);
            max-width: calc(100vw - 12px);
          }
        }


        /* ===== FINAL RESPONSIVE FULL-PAGE FIX =====
           Header and composer always stay visible.
           Only .chat-body scrolls.
           Laptop/tablet/mobile use full available page width.
        */
        html,
        body,
        #root {
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        body {
          overscroll-behavior: none;
          background: #e7f2df !important;
        }

        .nm-screen {
          width: 100vw !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          max-height: 100dvh !important;
          display: flex !important;
          align-items: stretch !important;
          justify-content: stretch !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: #e7f2df !important;
        }

        .nm-phone {
          width: 100vw !important;
          max-width: none !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          max-height: 100dvh !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          background: #e7f2df !important;
        }

        .nm-header {
          height: clamp(58px, 8dvh, 74px) !important;
          min-height: clamp(58px, 8dvh, 74px) !important;
          max-height: 74px !important;
          flex: 0 0 auto !important;
          position: relative !important;
          z-index: 50 !important;
          display: flex !important;
          align-items: center !important;
          gap: clamp(7px, 1.2vw, 12px) !important;
          padding: max(7px, env(safe-area-inset-top)) clamp(8px, 1.5vw, 16px) 7px !important;
          overflow: visible !important;
          background: #00796b !important;
          box-shadow: 0 1px 0 rgba(0,0,0,0.08) !important;
        }

        .header-logo {
          width: clamp(40px, 5vw, 52px) !important;
          height: clamp(40px, 5vw, 52px) !important;
          min-width: clamp(40px, 5vw, 52px) !important;
          min-height: clamp(40px, 5vw, 52px) !important;
          border-radius: 50% !important;
          flex: 0 0 auto !important;
          background: #ffffff !important;
          overflow: hidden !important;
        }

        .header-logo img {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }

        .header-title {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          max-width: none !important;
          display: block !important;
          overflow: hidden !important;
        }

        .header-title h2 {
          display: block !important;
          max-width: 100% !important;
          margin: 0 !important;
          font-size: clamp(16px, 2.1vw, 20px) !important;
          line-height: 1.1 !important;
          font-weight: 800 !important;
          color: #ffffff !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .header-title p {
          display: block !important;
          max-width: 100% !important;
          margin: 3px 0 0 !important;
          font-size: clamp(11px, 1.45vw, 14px) !important;
          line-height: 1.15 !important;
          font-weight: 500 !important;
          color: rgba(255,255,255,0.9) !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .header-icon-btn {
          width: clamp(32px, 4.2vw, 40px) !important;
          height: clamp(32px, 4.2vw, 40px) !important;
          flex: 0 0 auto !important;
          border: none !important;
          border-radius: 50% !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .search-box,
        .preview-strip,
        .edit-strip {
          flex: 0 0 auto !important;
          position: relative !important;
          z-index: 45 !important;
        }

        .chat-body {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          height: auto !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain !important;
          padding: clamp(7px, 1.2vw, 12px) clamp(7px, 1.2vw, 14px) clamp(9px, 1.3vw, 14px) !important;
          background-color: #e7f2df !important;
          background-image:
            radial-gradient(circle at 20px 20px, rgba(107, 114, 128, 0.08) 1.5px, transparent 2px),
            radial-gradient(circle at 140px 90px, rgba(107, 114, 128, 0.06) 1.5px, transparent 2px) !important;
          background-size: 260px 180px !important;
        }

        .composer {
          flex: 0 0 auto !important;
          position: relative !important;
          z-index: 55 !important;
          padding: 7px clamp(7px, 1.3vw, 14px) max(7px, env(safe-area-inset-bottom)) !important;
          background: #ffffff !important;
          border-top: 1px solid #d8ded6 !important;
          box-shadow: none !important;
        }

        .composer-card {
          border-radius: 14px !important;
          border-color: #d9e0d7 !important;
          background: #ffffff !important;
          padding: 5px !important;
          max-height: 28dvh !important;
          overflow: hidden !important;
        }

        .composer-tools {
          gap: 6px !important;
          margin-bottom: 5px !important;
        }

        .tool-left {
          gap: 5px !important;
          overflow-x: auto !important;
          scrollbar-width: none !important;
        }

        .tool-left::-webkit-scrollbar {
          display: none !important;
        }

        .tool-btn {
          width: 30px !important;
          height: 30px !important;
          min-width: 30px !important;
          border-radius: 9px !important;
          font-size: 12px !important;
        }

        .send-btn {
          width: 38px !important;
          height: 32px !important;
          min-width: 38px !important;
          border-radius: 11px !important;
          font-size: 15px !important;
        }

        .text-input {
          min-height: 34px !important;
          max-height: 86px !important;
          padding: 8px 10px !important;
          border-radius: 13px !important;
          font-size: 14px !important;
          line-height: 1.32 !important;
          font-weight: 500 !important;
        }

        .note-block,
        .message-line {
          width: 100% !important;
          max-width: 100% !important;
        }

        .message-line {
          margin-bottom: 7px !important;
        }

        .message-bubble {
          max-width: min(76vw, 520px) !important;
          min-width: 46px !important;
          padding: 6px 28px 17px 9px !important;
          border-radius: 6px 13px 13px 13px !important;
          border: none !important;
          background: #ffffff !important;
          box-shadow: 0 1px 1px rgba(0,0,0,0.08) !important;
          overflow: visible !important;
        }

        .message-bubble::before {
          border-top-color: #ffffff !important;
        }

        .message-text,
        .image-description-text {
          font-size: clamp(13px, 1.7vw, 14px) !important;
          line-height: 1.34 !important;
          font-weight: 500 !important;
          color: #111827 !important;
        }

        .message-title-text {
          font-size: clamp(14px, 1.8vw, 15px) !important;
          line-height: 1.25 !important;
          font-weight: 650 !important;
        }

        .message-dot-btn {
          top: 2px !important;
          right: 2px !important;
          width: 22px !important;
          height: 22px !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          background: transparent !important;
          color: #7b8794 !important;
        }

        .message-time {
          right: 7px !important;
          bottom: 4px !important;
          font-size: 9.5px !important;
          line-height: 1 !important;
          font-weight: 600 !important;
          color: #6b7280 !important;
          background: transparent !important;
          padding: 0 !important;
        }

        .message-bubble:has(.image-message-wrap),
        .message-bubble.image-only {
          width: fit-content !important;
          max-width: min(78vw, 560px) !important;
          padding: 3px 3px 18px 3px !important;
          overflow: visible !important;
        }

        .image-message-wrap {
          width: fit-content !important;
          max-width: 100% !important;
          display: block !important;
        }

        .whatsapp-image-frame {
          width: min(76vw, 430px) !important;
          max-width: min(76vw, 430px) !important;
          min-width: min(190px, calc(100vw - 32px)) !important;
          display: block !important;
          border-radius: 6px !important;
          overflow: hidden !important;
          background: #eef2f7 !important;
        }

        .whatsapp-image-frame .message-image,
        .message-image {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: min(48dvh, 460px) !important;
          object-fit: contain !important;
          opacity: 1 !important;
          filter: none !important;
          visibility: visible !important;
          border: none !important;
          border-radius: 6px !important;
          box-shadow: none !important;
          background: #eef2f7 !important;
        }

        .message-image.image-load-failed {
          min-height: 170px !important;
          object-fit: cover !important;
        }

        .image-only .message-time {
          right: 7px !important;
          bottom: 5px !important;
          color: #ffffff !important;
          background: rgba(0,0,0,0.38) !important;
          padding: 3px 6px !important;
          border-radius: 999px !important;
          font-size: 9.5px !important;
        }

        .message-action-row {
          gap: 5px !important;
          margin-top: 5px !important;
          padding-left: 1px !important;
        }

        .square-action {
          min-width: 70px !important;
          height: 30px !important;
          border-radius: 10px !important;
          padding: 0 9px !important;
          font-size: 11px !important;
          font-weight: 800 !important;
        }

        .date-separator {
          margin: 7px 0 10px !important;
        }

        .date-separator span {
          min-height: 24px !important;
          padding: 5px 12px !important;
          font-size: 11px !important;
        }

        @media (min-width: 768px) {
          .chat-body {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .message-bubble {
            max-width: min(54vw, 600px) !important;
          }

          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only {
            max-width: min(48vw, 560px) !important;
          }

          .whatsapp-image-frame {
            width: min(38vw, 430px) !important;
            max-width: min(38vw, 430px) !important;
            min-width: 240px !important;
          }
        }

        @media (max-width: 480px) {
          .nm-header {
            height: 58px !important;
            min-height: 58px !important;
            gap: 7px !important;
          }

          .header-logo {
            width: 42px !important;
            height: 42px !important;
            min-width: 42px !important;
            min-height: 42px !important;
          }

          .header-title h2 {
            font-size: 16px !important;
          }

          .header-title p {
            font-size: 11.5px !important;
          }

          .chat-body {
            padding-left: 7px !important;
            padding-right: 7px !important;
          }

          .message-bubble {
            max-width: 84vw !important;
          }

          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only {
            max-width: calc(100vw - 18px) !important;
          }

          .whatsapp-image-frame {
            width: min(82vw, 360px) !important;
            max-width: calc(100vw - 18px) !important;
            min-width: min(180px, calc(100vw - 18px)) !important;
          }

          .message-image {
            max-height: 44dvh !important;
          }
        }

        @media (max-width: 360px) {
          .message-text,
          .image-description-text,
          .text-input {
            font-size: 13px !important;
          }

          .message-bubble {
            max-width: 88vw !important;
          }

          .whatsapp-image-frame {
            width: min(86vw, 320px) !important;
          }

          .tool-btn {
            width: 29px !important;
            height: 29px !important;
            min-width: 29px !important;
          }
        }


        /* ===== FINAL MOBILE HEADER + TIME FIX ===== */
        .nm-header {
          height: auto !important;
          min-height: clamp(92px, 12.5dvh, 112px) !important;
          max-height: none !important;
          padding: max(30px, calc(env(safe-area-inset-top) + 22px)) clamp(10px, 2vw, 16px) 10px !important;
          align-items: center !important;
          background: #00796b !important;
          overflow: visible !important;
        }

        .header-logo {
          width: clamp(44px, 6vw, 54px) !important;
          height: clamp(44px, 6vw, 54px) !important;
          min-width: clamp(44px, 6vw, 54px) !important;
          min-height: clamp(44px, 6vw, 54px) !important;
        }

        .header-title h2 {
          font-size: clamp(17px, 4.7vw, 22px) !important;
          line-height: 1.12 !important;
        }

        .header-title p {
          font-size: clamp(11.5px, 3.2vw, 14px) !important;
          line-height: 1.15 !important;
          margin-top: 3px !important;
        }

        .header-icon-btn {
          width: 38px !important;
          height: 38px !important;
          min-width: 38px !important;
          min-height: 38px !important;
        }

        .back-btn {
          font-size: 34px !important;
          padding-bottom: 4px !important;
        }

        .chat-body {
          padding-top: 10px !important;
        }

        .message-bubble {
          min-width: 96px !important;
          padding: 8px 31px 23px 12px !important;
          border-radius: 8px 15px 15px 15px !important;
        }

        .message-text,
        .image-description-text {
          font-size: clamp(13.5px, 3.75vw, 15px) !important;
          line-height: 1.36 !important;
        }

        .message-time {
          right: 8px !important;
          bottom: 6px !important;
          font-size: 10.2px !important;
          line-height: 1 !important;
          font-weight: 700 !important;
          color: #64748b !important;
          background: transparent !important;
          max-width: calc(100% - 16px) !important;
          white-space: nowrap !important;
        }

        .message-bubble:has(.image-message-wrap),
        .message-bubble.image-only {
          min-width: 130px !important;
          padding: 4px 4px 24px 4px !important;
          border-radius: 8px 16px 16px 16px !important;
        }

        .image-only .message-time,
        .message-bubble:has(.image-message-wrap) .message-time {
          right: 9px !important;
          bottom: 7px !important;
          color: #ffffff !important;
          background: rgba(0, 0, 0, 0.48) !important;
          padding: 4px 7px !important;
          border-radius: 999px !important;
          font-size: 10.4px !important;
          font-weight: 800 !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18) !important;
        }

        .whatsapp-image-frame {
          width: min(82vw, 390px) !important;
          max-width: calc(100vw - 24px) !important;
          min-width: min(210px, calc(100vw - 24px)) !important;
          border-radius: 8px !important;
        }

        .whatsapp-image-frame .message-image,
        .message-image {
          border-radius: 8px !important;
          max-height: min(45dvh, 470px) !important;
        }

        @media (max-width: 480px) {
          .nm-header {
            min-height: 100px !important;
            height: 100px !important;
            padding: max(32px, calc(env(safe-area-inset-top) + 24px)) 9px 10px !important;
            gap: 7px !important;
          }

          .header-logo {
            width: 45px !important;
            height: 45px !important;
            min-width: 45px !important;
            min-height: 45px !important;
          }

          .header-title h2 {
            font-size: 17.5px !important;
          }

          .header-title p {
            font-size: 12px !important;
          }

          .message-bubble {
            min-width: 98px !important;
            max-width: 86vw !important;
            padding: 8px 31px 23px 12px !important;
          }

          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only {
            min-width: min(220px, calc(100vw - 20px)) !important;
            max-width: calc(100vw - 18px) !important;
            padding: 4px 4px 24px 4px !important;
          }

          .whatsapp-image-frame {
            width: min(84vw, 380px) !important;
            max-width: calc(100vw - 26px) !important;
            min-width: min(210px, calc(100vw - 26px)) !important;
          }
        }

        @media (max-width: 360px) {
          .nm-header {
            min-height: 96px !important;
            height: 96px !important;
            padding-top: max(30px, calc(env(safe-area-inset-top) + 22px)) !important;
          }

          .header-logo {
            width: 42px !important;
            height: 42px !important;
            min-width: 42px !important;
            min-height: 42px !important;
          }

          .header-title h2 {
            font-size: 16px !important;
          }

          .header-title p {
            font-size: 11px !important;
          }

          .message-bubble {
            min-width: 96px !important;
          }
        }




        /* ===== FINAL USER REQUEST FIX: HEADER SAFE AREA, COMPACT CARDS, SMALL DROPDOWN ===== */
        .nm-header {
          height: auto !important;
          min-height: clamp(112px, 15dvh, 132px) !important;
          max-height: none !important;
          padding: max(42px, calc(env(safe-area-inset-top) + 34px)) 9px 7px !important;
          align-items: flex-end !important;
          gap: 7px !important;
          background: #00796b !important;
          overflow: visible !important;
        }

        .header-logo {
          width: clamp(40px, 11vw, 48px) !important;
          height: clamp(40px, 11vw, 48px) !important;
          min-width: clamp(40px, 11vw, 48px) !important;
          min-height: clamp(40px, 11vw, 48px) !important;
          align-self: flex-end !important;
          margin-bottom: 0 !important;
        }

        .header-title {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          overflow: visible !important;
          align-self: flex-end !important;
          padding-bottom: 1px !important;
        }

        .header-title h2 {
          font-size: clamp(14.5px, 4.25vw, 18px) !important;
          line-height: 1.08 !important;
          font-weight: 850 !important;
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: unset !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          max-height: 40px !important;
        }

        .header-title p {
          font-size: clamp(10px, 3.05vw, 12px) !important;
          line-height: 1.08 !important;
          margin-top: 2px !important;
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: unset !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 1 !important;
          -webkit-box-orient: vertical !important;
          overflow-wrap: anywhere !important;
          max-height: 15px !important;
        }

        .header-icon-btn {
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
          min-height: 34px !important;
          align-self: flex-end !important;
          margin-bottom: 3px !important;
        }

        .back-btn {
          font-size: 31px !important;
          padding-bottom: 4px !important;
        }

        .search-btn {
          font-size: 14px !important;
        }

        .chat-body {
          padding-top: 9px !important;
        }

        .message-line {
          position: relative !important;
          margin-bottom: 7px !important;
        }

        .message-bubble {
          width: fit-content !important;
          min-width: 0 !important;
          max-width: min(80vw, 430px) !important;
          padding: 7px 47px 19px 10px !important;
          border-radius: 7px 14px 14px 14px !important;
          background: #ffffff !important;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12) !important;
          overflow: visible !important;
        }

        .message-text,
        .image-description-text {
          font-size: clamp(13px, 3.55vw, 14.5px) !important;
          line-height: 1.33 !important;
          font-weight: 500 !important;
          max-width: 100% !important;
        }

        .message-title-text {
          font-size: clamp(13.5px, 3.75vw, 15px) !important;
          line-height: 1.25 !important;
        }

        .message-time {
          right: 8px !important;
          bottom: 5px !important;
          font-size: 10px !important;
          line-height: 1 !important;
          font-weight: 700 !important;
          color: #64748b !important;
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
          white-space: nowrap !important;
          max-width: none !important;
        }

        .message-bubble:has(.image-message-wrap),
        .message-bubble.image-only {
          width: fit-content !important;
          min-width: 0 !important;
          max-width: calc(100vw - 18px) !important;
          padding: 4px 4px 25px 4px !important;
          border-radius: 8px 15px 15px 15px !important;
        }

        .image-message-wrap {
          width: fit-content !important;
          max-width: 100% !important;
        }

        .whatsapp-image-frame {
          width: min(82vw, 380px) !important;
          max-width: calc(100vw - 26px) !important;
          min-width: min(170px, calc(100vw - 26px)) !important;
          border-radius: 8px !important;
        }

        .whatsapp-image-frame .message-image,
        .message-image {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          max-height: min(44dvh, 440px) !important;
          object-fit: contain !important;
          border-radius: 8px !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        .image-only .message-time,
        .message-bubble:has(.image-message-wrap) .message-time {
          right: 9px !important;
          bottom: 7px !important;
          color: #ffffff !important;
          background: rgba(0, 0, 0, 0.50) !important;
          padding: 3px 7px !important;
          border-radius: 999px !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18) !important;
        }

        .message-dot-btn {
          top: 3px !important;
          right: 3px !important;
          width: 20px !important;
          height: 20px !important;
          border-radius: 7px !important;
          font-size: 13px !important;
          z-index: 9 !important;
          background: rgba(255,255,255,0.52) !important;
        }

        .message-action-row {
          position: absolute !important;
          top: 27px !important;
          left: 8px !important;
          width: 108px !important;
          max-width: calc(100vw - 28px) !important;
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 4px !important;
          margin: 0 !important;
          padding: 5px !important;
          background: rgba(255,255,255,0.98) !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: 0 14px 36px rgba(15, 23, 42, 0.20) !important;
          z-index: 85 !important;
          overflow: visible !important;
        }

        .square-action {
          width: 100% !important;
          min-width: 0 !important;
          height: 24px !important;
          min-height: 24px !important;
          padding: 0 7px !important;
          border-radius: 8px !important;
          font-size: 10.5px !important;
          line-height: 1 !important;
          font-weight: 850 !important;
          box-shadow: none !important;
          justify-content: center !important;
        }

        .composer {
          padding: 7px clamp(8px, 2vw, 14px) max(8px, env(safe-area-inset-bottom)) !important;
        }

        .send-btn {
          width: 64px !important;
          min-width: 64px !important;
          height: 42px !important;
          min-height: 42px !important;
          border-radius: 14px !important;
          font-size: 20px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .date-separator span {
          background: linear-gradient(135deg, var(--badge1), var(--badge2)) !important;
        }

        @media (max-width: 480px) {
          .nm-header {
            min-height: 112px !important;
            height: auto !important;
            padding: max(42px, calc(env(safe-area-inset-top) + 34px)) 8px 7px !important;
          }

          .header-title h2 {
            font-size: 15.5px !important;
            max-height: 36px !important;
          }

          .header-title p {
            font-size: 10.8px !important;
          }

          .message-bubble {
            max-width: 82vw !important;
            padding: 7px 46px 19px 10px !important;
          }

          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only {
            max-width: calc(100vw - 16px) !important;
            padding: 4px 4px 25px 4px !important;
          }

          .whatsapp-image-frame {
            width: min(82vw, 372px) !important;
            max-width: calc(100vw - 24px) !important;
            min-width: min(165px, calc(100vw - 24px)) !important;
          }

          .send-btn {
            width: 62px !important;
            min-width: 62px !important;
          }
        }

        @media (max-width: 360px) {
          .nm-header {
            min-height: 108px !important;
            padding-top: max(40px, calc(env(safe-area-inset-top) + 32px)) !important;
          }

          .header-logo {
            width: 39px !important;
            height: 39px !important;
            min-width: 39px !important;
            min-height: 39px !important;
          }

          .header-title h2 {
            font-size: 14px !important;
          }

          .header-title p {
            font-size: 10px !important;
          }

          .message-bubble {
            max-width: 86vw !important;
            padding-right: 44px !important;
          }

          .message-action-row {
            width: 102px !important;
          }

          .send-btn {
            width: 58px !important;
            min-width: 58px !important;
          }
        }


        /* ===============================
           Final professional UI overrides
           Keeps the same page and features
        =============================== */

        .nm-screen {
          background:
            radial-gradient(circle at 12% 6%, rgba(45, 212, 191, 0.35), transparent 28%),
            radial-gradient(circle at 92% 14%, rgba(56, 189, 248, 0.28), transparent 30%),
            radial-gradient(circle at 78% 92%, rgba(129, 140, 248, 0.24), transparent 34%),
            linear-gradient(145deg, #020617 0%, #0f172a 46%, #0f766e 100%) !important;
        }

        .nm-phone {
          background:
            radial-gradient(circle at 5% 0%, rgba(204, 251, 241, 0.55), transparent 28%),
            radial-gradient(circle at 95% 100%, rgba(219, 234, 254, 0.70), transparent 32%),
            linear-gradient(135deg, #eefdf7 0%, #f8fbff 50%, #eef2ff 100%) !important;
        }

        .chat-body {
          background:
            radial-gradient(circle at 8% 8%, rgba(255, 255, 255, 0.78), transparent 29%),
            radial-gradient(circle at 92% 94%, rgba(14, 165, 233, 0.18), transparent 31%),
            linear-gradient(135deg, #e8fff5 0%, #f8fbff 48%, #ecf1ff 100%) !important;
        }

        .message-dot-btn,
        .message-dot-btn:hover,
        .message-dot-btn:focus,
        .message-dot-btn:active,
        .message-bubble:has(.image-message-wrap) .message-dot-btn,
        .message-bubble:has(.message-image) .message-dot-btn,
        .image-only .message-dot-btn {
          top: 2px !important;
          right: 2px !important;
          width: 18px !important;
          height: 18px !important;
          min-width: 18px !important;
          min-height: 18px !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          color: #111111 !important;
          box-shadow: none !important;
          outline: none !important;
          filter: none !important;
          opacity: 1 !important;
          font-size: 13px !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          text-shadow: none !important;
        }

        .message-dot-btn::before,
        .message-dot-btn::after {
          display: none !important;
          content: none !important;
        }

        .composer {
          background: rgba(248, 250, 252, 0.72) !important;
          border-top: 1px solid rgba(226, 232, 240, 0.72) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
        }

        .composer-card {
          background: rgba(255, 255, 255, 0.92) !important;
          border: 1px solid rgba(226, 232, 240, 0.88) !important;
          border-radius: 20px !important;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.12) !important;
          overflow: hidden !important;
        }

        .text-input {
          border: none !important;
          border-radius: 0 !important;
          border-bottom: 2px solid rgba(14, 165, 233, 0.62) !important;
          background:
            linear-gradient(90deg, rgba(240, 253, 250, 0.95), rgba(239, 246, 255, 0.95)) !important;
          box-shadow: none !important;
          margin: 0 10px 10px !important;
          padding: 11px 4px 8px !important;
          min-height: 42px !important;
          transition: border-color 0.18s ease, background 0.18s ease !important;
        }

        .text-input:focus,
        .text-input:focus-visible {
          border-bottom-color: #0f766e !important;
          outline: none !important;
          box-shadow: none !important;
          background:
            linear-gradient(90deg, rgba(236, 253, 245, 1), rgba(239, 246, 255, 1)) !important;
        }

        .send-btn {
          background: linear-gradient(135deg, #0f766e, #0ea5e9) !important;
          color: #ffffff !important;
          box-shadow: 0 8px 20px rgba(14, 165, 233, 0.25) !important;
          transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease !important;
          will-change: transform !important;
        }

        .send-btn:active:not(:disabled) {
          transform: translateY(1px) scale(0.94) !important;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.22) !important;
          filter: brightness(0.98) !important;
        }

        .send-btn:disabled {
          cursor: not-allowed !important;
          opacity: 0.82 !important;
        }

        .message-time span:nth-child(2) {
          display: inline-flex !important;
          align-items: center !important;
          gap: 2px !important;
          color: #16a34a !important;
          font-size: 7px !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: 0 !important;
          text-transform: lowercase !important;
          animation: tinySendPulse 0.65s ease-in-out infinite !important;
        }

        .message-time span:nth-child(2)::before {
          content: "" !important;
          width: 4px !important;
          height: 4px !important;
          border-radius: 999px !important;
          background: #22c55e !important;
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45) !important;
          animation: tinyGreenDot 0.65s ease-in-out infinite !important;
        }

        @keyframes tinySendPulse {
          0%, 100% {
            opacity: 0.55;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }

        @keyframes tinyGreenDot {
          0%, 100% {
            transform: scale(0.8);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.30);
          }
          50% {
            transform: scale(1);
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.10);
          }
        }

        @media (max-width: 480px) {
          .text-input {
            margin: 0 9px 9px !important;
          }

          .message-dot-btn,
          .message-dot-btn:hover,
          .message-dot-btn:focus,
          .message-dot-btn:active {
            width: 18px !important;
            height: 18px !important;
            font-size: 13px !important;
            background: transparent !important;
            box-shadow: none !important;
            color: #111111 !important;
          }
        }


        /* =========================================
           Final requested fixes - full page safe
           - outside tap closes options
           - plain black three dots
           - no content hidden behind dots
           - fresh modern channel header
        ========================================= */

        .nm-header {
          background:
            radial-gradient(circle at 6% 0%, rgba(255, 255, 255, 0.28), transparent 28%),
            radial-gradient(circle at 94% 12%, rgba(187, 247, 208, 0.26), transparent 34%),
            linear-gradient(135deg, #075985 0%, #0f766e 46%, #10b981 100%) !important;
          color: #ffffff !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.20) !important;
          box-shadow: 0 12px 30px rgba(8, 47, 73, 0.20) !important;
        }

        .header-logo {
          background: linear-gradient(135deg, rgba(255,255,255,0.24), rgba(204,251,241,0.18)) !important;
          border: 1px solid rgba(255,255,255,0.34) !important;
          box-shadow: 0 8px 22px rgba(8, 47, 73, 0.18) !important;
        }

        .header-title h2,
        .header-title p {
          text-shadow: none !important;
        }

        .message-line {
          cursor: default !important;
        }

        .message-bubble {
          overflow: visible !important;
          padding-right: 44px !important;
        }

        .message-bubble:has(.image-message-wrap),
        .message-bubble.image-only,
        .message-bubble:has(.message-image) {
          padding: 23px 5px 23px 5px !important;
        }

        .message-bubble:has(.image-message-wrap.with-description) {
          padding: 23px 7px 22px 7px !important;
        }

        .message-text,
        .image-description-text {
          padding-right: 0 !important;
        }

        .message-dot-btn,
        .message-dot-btn:hover,
        .message-dot-btn:focus,
        .message-dot-btn:active,
        .message-active .message-dot-btn,
        .message-bubble:has(.image-message-wrap) .message-dot-btn,
        .message-bubble:has(.message-image) .message-dot-btn,
        .message-bubble.image-only .message-dot-btn,
        .image-only .message-dot-btn {
          position: absolute !important;
          top: 3px !important;
          right: 6px !important;
          width: 22px !important;
          height: 18px !important;
          min-width: 22px !important;
          min-height: 18px !important;
          padding: 0 !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          color: #000000 !important;
          box-shadow: none !important;
          outline: none !important;
          filter: none !important;
          opacity: 1 !important;
          font-family: Arial, sans-serif !important;
          font-size: 14px !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          text-shadow: none !important;
          transform: none !important;
          appearance: none !important;
          -webkit-appearance: none !important;
        }

        .message-dot-btn::before,
        .message-dot-btn::after,
        .message-active .message-dot-btn::before,
        .message-active .message-dot-btn::after {
          display: none !important;
          content: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .message-action-row {
          z-index: 120 !important;
        }

        @media (max-width: 480px) {
          .nm-header {
            background:
              radial-gradient(circle at 8% 0%, rgba(255,255,255,0.26), transparent 28%),
              radial-gradient(circle at 92% 10%, rgba(187,247,208,0.25), transparent 34%),
              linear-gradient(135deg, #075985 0%, #0f766e 48%, #10b981 100%) !important;
          }

          .message-bubble {
            padding-right: 44px !important;
          }

          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only,
          .message-bubble:has(.message-image) {
            padding: 23px 4px 24px 4px !important;
          }

          .message-dot-btn,
          .message-dot-btn:hover,
          .message-dot-btn:focus,
          .message-dot-btn:active,
          .message-active .message-dot-btn,
          .message-bubble:has(.image-message-wrap) .message-dot-btn,
          .message-bubble:has(.message-image) .message-dot-btn,
          .message-bubble.image-only .message-dot-btn,
          .image-only .message-dot-btn {
            top: 3px !important;
            right: 6px !important;
            width: 22px !important;
            height: 18px !important;
            min-width: 22px !important;
            min-height: 18px !important;
            background: transparent !important;
            color: #000000 !important;
            box-shadow: none !important;
            filter: none !important;
            font-size: 14px !important;
            text-shadow: none !important;
          }
        }


        /* =========================================
           Final clean toast + compact actions
           - no large delete/update popup
           - small center toast alerts
           - compact smooth Update/Delete tabs
        ========================================= */

        .message-action-row {
          gap: 5px !important;
          margin-top: 5px !important;
          padding: 3px 0 0 2px !important;
          max-width: min(94vw, 360px) !important;
          animation: miniActionsIn 0.16s ease both !important;
        }

        @keyframes miniActionsIn {
          from {
            opacity: 0;
            transform: translateY(-3px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .square-action {
          height: 27px !important;
          min-width: auto !important;
          padding: 0 10px !important;
          border-radius: 999px !important;
          font-size: 10.5px !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          box-shadow: none !important;
          transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease !important;
        }

        .square-action:active {
          transform: scale(0.95) !important;
        }

        .update-square,
        .text-square,
        .title-square,
        .download-square,
        .delete-square {
          border-width: 1px !important;
          box-shadow: none !important;
        }

        .update-square {
          color: #075985 !important;
          background: #e0f2fe !important;
          border-color: #bae6fd !important;
        }

        .text-square,
        .title-square {
          color: #0f766e !important;
          background: #ccfbf1 !important;
          border-color: #99f6e4 !important;
        }

        .download-square {
          color: #047857 !important;
          background: #dcfce7 !important;
          border-color: #bbf7d0 !important;
        }

        .delete-square {
          color: #b91c1c !important;
          background: #fee2e2 !important;
          border-color: #fecaca !important;
        }

        .popup-layer {
          z-index: 180 !important;
          padding: 18px !important;
          pointer-events: none !important;
          background: transparent !important;
          backdrop-filter: none !important;
        }

        .toast {
          width: auto !important;
          min-width: 132px !important;
          max-width: min(220px, calc(100vw - 44px)) !important;
          min-height: 42px !important;
          padding: 9px 13px !important;
          border-radius: 999px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          background: rgba(255, 255, 255, 0.97) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.16) !important;
          text-align: left !important;
          backdrop-filter: blur(14px) !important;
          animation: cleanToastIn 0.18s cubic-bezier(.2,.9,.3,1) both !important;
        }

        @keyframes cleanToastIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .toast-icon {
          width: 21px !important;
          height: 21px !important;
          min-width: 21px !important;
          margin: 0 !important;
          font-size: 12px !important;
          border-radius: 999px !important;
        }

        .toast.success .toast-icon {
          background: #dcfce7 !important;
          color: #16a34a !important;
        }

        .toast.error .toast-icon {
          background: #fee2e2 !important;
          color: #dc2626 !important;
        }

        .toast p {
          margin: 0 !important;
          color: #0f172a !important;
          font-size: 12px !important;
          line-height: 1.15 !important;
          font-weight: 900 !important;
          white-space: nowrap !important;
        }

        .confirm-layer {
          z-index: 175 !important;
          background: transparent !important;
          backdrop-filter: none !important;
          pointer-events: none !important;
          padding: 18px !important;
        }

        .confirm-card {
          width: auto !important;
          max-width: 260px !important;
          padding: 12px 13px !important;
          border-radius: 18px !important;
          box-shadow: 0 14px 40px rgba(15, 23, 42, 0.18) !important;
          pointer-events: auto !important;
        }

        .confirm-icon {
          display: none !important;
        }

        .confirm-card h3 {
          font-size: 13px !important;
          margin: 0 0 4px !important;
        }

        .confirm-card p {
          font-size: 11px !important;
          margin: 0 0 9px !important;
        }

        .confirm-actions button {
          height: 29px !important;
          border-radius: 999px !important;
          font-size: 11px !important;
        }

        @media (max-width: 480px) {
          .message-action-row {
            gap: 4px !important;
            padding-left: 1px !important;
          }

          .square-action {
            height: 26px !important;
            padding: 0 9px !important;
            font-size: 10px !important;
          }

          .toast {
            min-width: 124px !important;
            max-width: calc(100vw - 54px) !important;
            min-height: 40px !important;
            padding: 8px 12px !important;
          }

          .toast p {
            font-size: 11.5px !important;
          }
        }



        /* ===== FINAL UI FIX: normal text, tiny time, larger search, smaller images ===== */
        .search-btn {
          width: 40px !important;
          height: 40px !important;
          border-radius: 14px !important;
          font-size: 18px !important;
        }

        .search-box {
          padding: 10px 12px !important;
          gap: 10px !important;
          background: rgba(255,255,255,0.98) !important;
        }

        .search-box span {
          width: 35px !important;
          height: 35px !important;
          border-radius: 13px !important;
          font-size: 16px !important;
        }

        .search-box input {
          height: 44px !important;
          border-radius: 18px !important;
          font-size: 15.5px !important;
          font-weight: 800 !important;
        }

        .search-box button {
          width: 36px !important;
          height: 36px !important;
          border-radius: 13px !important;
          font-size: 22px !important;
        }

        .search-result-bar {
          flex-shrink: 0;
          padding: 7px 14px 9px;
          background: rgba(236, 254, 255, 0.96);
          color: #0f766e;
          border-bottom: 1px solid rgba(14, 165, 233, 0.16);
          font-size: 12px;
          line-height: 1.25;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .message-bubble {
          padding: 8px 39px 18px 11px !important;
          min-height: 35px !important;
        }

        .message-text,
        .message-text div,
        .message-text p {
          font-size: 15.5px !important;
          line-height: 1.42 !important;
          font-weight: 600 !important;
          color: inherit;
        }

        .image-description-text {
          font-size: 15px !important;
          line-height: 1.42 !important;
          font-weight: 600 !important;
          padding: 7px 8px 3px !important;
        }

        .message-time,
        .image-only .message-time {
          position: absolute !important;
          right: 7px !important;
          bottom: 5px !important;
          font-size: 8.4px !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          color: #64748b !important;
          opacity: 0.72 !important;
          white-space: nowrap !important;
          transform: none !important;
        }

        .message-dot-btn {
          top: 4px !important;
          right: 4px !important;
          width: 23px !important;
          height: 23px !important;
          font-size: 15px !important;
        }

        .whatsapp-image-frame {
          width: fit-content !important;
          max-width: min(238px, 62vw) !important;
          border-radius: 10px !important;
          background: #f8fafc !important;
        }

        .whatsapp-image-frame .message-image {
          opacity: 1 !important;
          filter: none !important;
        }

        .message-image {
          width: auto !important;
          max-width: min(238px, 62vw) !important;
          max-height: 260px !important;
          height: auto !important;
          object-fit: contain !important;
          border-radius: 10px !important;
          border: none !important;
          box-shadow: none !important;
          background: #f8fafc !important;
        }

        .message-bubble:has(.image-message-wrap),
        .message-bubble.image-only {
          max-width: min(260px, 68vw) !important;
          min-width: 86px !important;
          padding: 4px 4px 18px 4px !important;
        }

        .message-bubble:has(.image-message-wrap.with-description) {
          padding: 4px 8px 18px 4px !important;
        }

        .preview-strip img {
          width: 42px !important;
          height: 42px !important;
          object-fit: cover !important;
          border-radius: 10px !important;
        }

        @media (max-width: 380px) {
          .message-image,
          .whatsapp-image-frame {
            max-width: min(218px, 61vw) !important;
          }

          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only {
            max-width: min(238px, 68vw) !important;
          }

          .message-text,
          .message-text div,
          .message-text p {
            font-size: 15px !important;
          }
        }


        /* =========================================
           FINAL COLOR + INPUT + TIME FIX
           Selected color must show while typing and after send.
           Inner HTML colors are overridden, but bold/underline stay.
        ========================================= */

        .text-input {
          color: var(--composerColor, #111111) !important;
          caret-color: var(--composerColor, #111111) !important;
          background: #ffffff !important;
          min-height: 40px !important;
          max-height: 96px !important;
          padding: 9px 11px !important;
          font-size: 15px !important;
          line-height: 1.38 !important;
          font-weight: 500 !important;
          opacity: 1 !important;
          -webkit-text-fill-color: var(--composerColor, #111111) !important;
        }

        .text-input *,
        .text-input div,
        .text-input p,
        .text-input span,
        .text-input font {
          font-size: inherit !important;
          line-height: inherit !important;
        }

        .text-input:empty::before {
          color: #94a3b8 !important;
          -webkit-text-fill-color: #94a3b8 !important;
        }

        .message-bubble {
          width: fit-content !important;
          max-width: min(80vw, 330px) !important;
          min-width: 46px !important;
          padding: 6px 31px 17px 9px !important;
          border-radius: 7px 15px 15px 15px !important;
          background: #ffffff !important;
          overflow: visible !important;
        }

        .message-bubble.image-only,
        .message-bubble:has(.image-message-wrap),
        .message-bubble:has(.message-image) {
          max-width: min(252px, 70vw) !important;
          min-width: 92px !important;
          padding: 22px 4px 22px 4px !important;
        }

        .message-text,
        .image-description-text {
          font-size: 15px !important;
          line-height: 1.36 !important;
          font-weight: 500 !important;
          padding-right: 0 !important;
          margin: 0 !important;
        }

        .message-text *,
        .image-description-text *,
        .message-text div,
        .message-text p,
        .message-text span,
        .message-text font,
        .image-description-text div,
        .image-description-text p,
        .image-description-text span,
        .image-description-text font {
          color: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
        }

        .message-text b,
        .message-text strong,
        .image-description-text b,
        .image-description-text strong {
          font-weight: 900 !important;
        }

        .message-text u,
        .image-description-text u {
          text-decoration: underline !important;
          text-underline-offset: 3px !important;
        }

        .message-time {
          position: absolute !important;
          right: 7px !important;
          bottom: 4px !important;
          font-size: 8.8px !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          color: #64748b !important;
          background: rgba(248, 250, 252, 0.82) !important;
          border-radius: 999px !important;
          padding: 2px 5px !important;
          max-width: calc(100% - 14px) !important;
          white-space: nowrap !important;
          user-select: none !important;
          box-shadow: none !important;
          z-index: 2 !important;
        }

        .message-bubble:has(.image-message-wrap) .message-time,
        .message-bubble:has(.message-image) .message-time,
        .image-only .message-time {
          right: 7px !important;
          bottom: 5px !important;
          font-size: 8.8px !important;
          color: #ffffff !important;
          background: rgba(15, 23, 42, 0.62) !important;
          padding: 2px 6px !important;
          border-radius: 999px !important;
        }

        .message-image,
        .whatsapp-image-frame {
          max-width: min(224px, 64vw) !important;
          max-height: 260px !important;
        }

        /* ===============================
           FINAL HEADER FIX
           Logo + title always in one professional row
        ================================ */
        .nm-header {
          height: 74px !important;
          min-height: 74px !important;
          max-height: 74px !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 9px !important;
          padding: max(10px, env(safe-area-inset-top)) 11px 10px !important;
          overflow: hidden !important;
          background:
            radial-gradient(circle at 6% 0%, rgba(255, 255, 255, 0.25), transparent 30%),
            radial-gradient(circle at 94% 10%, rgba(187, 247, 208, 0.22), transparent 32%),
            linear-gradient(135deg, #075985 0%, #0f766e 48%, #10b981 100%) !important;
          box-shadow: 0 10px 26px rgba(8, 47, 73, 0.22) !important;
        }

        .header-brand-row {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          height: 52px !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 10px !important;
          padding: 5px 10px 5px 6px !important;
          border-radius: 19px !important;
          background: rgba(255, 255, 255, 0.14) !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.20),
            0 8px 20px rgba(8, 47, 73, 0.14) !important;
          backdrop-filter: blur(12px) !important;
        }

        .header-brand-row .header-logo {
          width: 42px !important;
          height: 42px !important;
          min-width: 42px !important;
          max-width: 42px !important;
          flex: 0 0 42px !important;
          margin: 0 !important;
          border-radius: 15px !important;
          position: relative !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: linear-gradient(135deg, #ecfeff, #dbeafe) !important;
          color: #0f766e !important;
          box-shadow:
            0 8px 18px rgba(8, 47, 73, 0.22),
            inset 0 0 0 2px rgba(255, 255, 255, 0.40) !important;
        }

        .header-brand-row .header-logo img {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
          position: relative !important;
          z-index: 2 !important;
        }

        .header-brand-row .logo-fallback-letter {
          position: absolute !important;
          inset: 0 !important;
          z-index: 1 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #0f766e !important;
          font-size: 18px !important;
          font-weight: 950 !important;
          line-height: 1 !important;
        }

        .header-brand-row .header-title {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          height: 42px !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          justify-content: center !important;
          text-align: left !important;
          overflow: hidden !important;
        }

        .header-brand-row .header-title h2 {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          color: #ffffff !important;
          font-size: clamp(15px, 4.2vw, 18px) !important;
          line-height: 1.12 !important;
          font-weight: 950 !important;
          letter-spacing: 0.1px !important;
          text-align: left !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .header-brand-row .header-title p {
          width: 100% !important;
          margin: 3px 0 0 !important;
          padding: 0 !important;
          color: rgba(255, 255, 255, 0.86) !important;
          font-size: 10.8px !important;
          line-height: 1.1 !important;
          font-weight: 800 !important;
          text-align: left !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        .nm-header > .header-icon-btn {
          width: 36px !important;
          height: 36px !important;
          min-width: 36px !important;
          flex: 0 0 36px !important;
          border-radius: 14px !important;
          margin: 0 !important;
        }

        .nm-header .back-btn {
          font-size: 32px !important;
          line-height: 1 !important;
          padding-bottom: 4px !important;
        }

        .nm-header .search-btn {
          font-size: 17px !important;
        }

        @media (max-width: 360px) {
          .nm-header {
            gap: 7px !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .header-brand-row {
            gap: 8px !important;
            padding-right: 8px !important;
          }

          .header-brand-row .header-logo {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            flex-basis: 40px !important;
          }

          .header-brand-row .header-title h2 {
            font-size: 15px !important;
          }

          .header-brand-row .header-title p {
            font-size: 10px !important;
          }
        }


        /* =====================================================
           FINAL SAFE HEADER UPDATE
           - Extra top space for mobile notch/camera
           - Logo + title stay in one professional row
           - Big channel title wraps and stays fully visible
        ====================================================== */
        .nm-header {
          height: auto !important;
          min-height: 96px !important;
          max-height: none !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 9px !important;
          padding-top: calc(env(safe-area-inset-top, 0px) + 18px) !important;
          padding-right: 11px !important;
          padding-bottom: 10px !important;
          padding-left: 11px !important;
          overflow: visible !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.08) 0 18px, transparent 18px),
            radial-gradient(circle at 6% 0%, rgba(255, 255, 255, 0.25), transparent 30%),
            radial-gradient(circle at 94% 10%, rgba(187, 247, 208, 0.22), transparent 32%),
            linear-gradient(135deg, #075985 0%, #0f766e 48%, #10b981 100%) !important;
          box-shadow: 0 10px 26px rgba(8, 47, 73, 0.22) !important;
        }

        .header-brand-row {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 56px !important;
          max-height: none !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 10px !important;
          padding: 7px 10px 7px 7px !important;
          border-radius: 20px !important;
          overflow: visible !important;
        }

        .header-brand-row .header-logo {
          width: 42px !important;
          height: 42px !important;
          min-width: 42px !important;
          max-width: 42px !important;
          flex: 0 0 42px !important;
          align-self: center !important;
          margin: 0 !important;
          border-radius: 15px !important;
        }

        .header-brand-row .header-title {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 42px !important;
          max-height: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          justify-content: center !important;
          text-align: left !important;
          overflow: visible !important;
        }

        .header-brand-row .header-title h2 {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          color: #ffffff !important;
          font-size: clamp(13px, 3.75vw, 17px) !important;
          line-height: 1.16 !important;
          font-weight: 950 !important;
          letter-spacing: 0.08px !important;
          text-align: left !important;
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
          display: block !important;
        }

        .header-brand-row .header-title p {
          width: 100% !important;
          margin: 3px 0 0 !important;
          padding: 0 !important;
          color: rgba(255, 255, 255, 0.88) !important;
          font-size: clamp(9.5px, 2.8vw, 11px) !important;
          line-height: 1.15 !important;
          font-weight: 800 !important;
          text-align: left !important;
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
          display: block !important;
        }

        .nm-header > .header-icon-btn {
          align-self: center !important;
        }

        @media (max-width: 360px) {
          .nm-header {
            min-height: 94px !important;
            gap: 7px !important;
            padding-top: calc(env(safe-area-inset-top, 0px) + 17px) !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .header-brand-row {
            gap: 8px !important;
            min-height: 54px !important;
            padding: 7px 8px 7px 6px !important;
          }

          .header-brand-row .header-logo {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            max-width: 40px !important;
            flex-basis: 40px !important;
          }

          .header-brand-row .header-title h2 {
            font-size: clamp(12.2px, 3.65vw, 15px) !important;
            line-height: 1.14 !important;
          }

          .header-brand-row .header-title p {
            font-size: 9.5px !important;
          }
        }


        /* =========================================================
           ANY FILE ATTACHMENT + FULL LOGO PROFESSIONAL FIX
        ========================================================= */
        .header-brand-row .header-logo,
        .header-logo,
        .unlock-logo {
          border-radius: 50% !important;
          overflow: hidden !important;
          background: rgba(255, 255, 255, 0.98) !important;
          border: 2px solid rgba(255, 255, 255, 0.92) !important;
          padding: 3px !important;
          box-shadow:
            0 12px 26px rgba(15, 23, 42, 0.22),
            inset 0 0 0 1px rgba(14, 165, 233, 0.08) !important;
        }

        .header-brand-row .header-logo img,
        .header-logo img,
        .unlock-logo img {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
          border-radius: 50% !important;
          background: #ffffff !important;
          display: block !important;
        }

        .header-brand-row .logo-fallback-letter,
        .header-logo .logo-fallback-letter,
        .unlock-logo .logo-fallback-letter {
          border-radius: 50% !important;
        }

        .file-tool {
          background: linear-gradient(135deg, #fff7ed, #ffedd5) !important;
          color: #c2410c !important;
        }

        .file-tool.active {
          background: linear-gradient(135deg, #fb923c, #f97316) !important;
          color: #ffffff !important;
          box-shadow: 0 8px 18px rgba(249, 115, 22, 0.24) !important;
        }

        .file-icon-img {
          width: 21px !important;
          height: 21px !important;
          object-fit: contain !important;
          border-radius: 7px;
          display: block;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.16);
        }

        .message-bubble.file-only {
          padding: 6px 29px 18px 6px;
          min-width: 210px;
          max-width: min(86%, 340px);
        }

        .file-message-wrap {
          width: min(276px, 72vw);
          max-width: 100%;
          display: grid;
          gap: 7px;
        }

        .file-card {
          width: 100%;
          min-height: 66px;
          border: 1px solid rgba(203, 213, 225, 0.9);
          border-radius: 16px;
          background:
            linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(239, 246, 255, 0.96));
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr) 28px;
          align-items: center;
          gap: 10px;
          padding: 9px;
          cursor: pointer;
          text-align: left;
          box-shadow: 0 7px 18px rgba(15, 23, 42, 0.09);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .file-card:hover,
        .file-card:focus-visible {
          transform: translateY(-1px);
          border-color: rgba(14, 165, 233, 0.55);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
          outline: none;
        }

        .file-card:active {
          transform: scale(0.985);
        }

        .file-type-badge {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.4px;
          box-shadow: 0 9px 18px rgba(14, 165, 233, 0.22);
        }

        .file-info {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .file-info strong {
          color: #0f172a;
          font-size: 13px;
          line-height: 1.22;
          font-weight: 950;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-info small {
          color: #64748b;
          font-size: 11px;
          line-height: 1.2;
          font-weight: 800;
        }

        .file-download-mini {
          width: 27px;
          height: 27px;
          border-radius: 10px;
          background: rgba(14, 165, 233, 0.12);
          color: #0369a1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 950;
        }

        .file-description-text {
          padding: 2px 2px 0;
        }

        .file-preview-strip {
          gap: 9px !important;
        }

        .preview-file-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, #f97316, #f59e0b);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.3px;
          flex-shrink: 0;
          box-shadow: 0 10px 22px rgba(249, 115, 22, 0.22);
        }

        .square-action {
          transition:
            transform 0.16s ease,
            box-shadow 0.16s ease,
            opacity 0.16s ease !important;
        }

        .square-action:active,
        .tool-btn:active,
        .send-btn:active {
          transform: scale(0.96) !important;
        }

        @media (max-width: 360px) {
          .file-message-wrap {
            width: min(250px, 72vw);
          }

          .file-card {
            grid-template-columns: 40px minmax(0, 1fr) 24px;
            gap: 8px;
            padding: 8px;
          }

          .file-type-badge {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            font-size: 10px;
          }

          .file-info strong {
            font-size: 12px;
          }
        }


        /* Device wise full message cards + real-time friendly layout */
        .message-line {
          margin: 0 0 11px !important;
          display: flex !important;
          align-items: flex-end !important;
          padding: 0 10px !important;
        }

        .message-line.my-message-line {
          justify-content: flex-end !important;
        }

        .message-line.other-message-line {
          justify-content: flex-start !important;
        }

        .message-bubble {
          position: relative !important;
          width: fit-content !important;
          max-width: min(88vw, 420px) !important;
          min-width: 82px !important;
          padding: 11px 38px 24px 12px !important;
          border-radius: 20px !important;
          overflow: hidden !important;
          background: linear-gradient(135deg, var(--device-card-1), var(--device-card-2)) !important;
          border: 1px solid color-mix(in srgb, var(--device-accent) 24%, transparent) !important;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.13) !important;
          backdrop-filter: none !important;
        }

        .message-bubble.my-message-bubble {
          border-bottom-right-radius: 7px !important;
        }

        .message-bubble.other-message-bubble {
          border-bottom-left-radius: 7px !important;
        }

        .message-bubble::before {
          display: none !important;
        }

        .message-bubble.image-only,
        .message-bubble.file-only,
        .message-bubble:has(.image-message-wrap),
        .message-bubble:has(.file-message-wrap) {
          padding: 8px 8px 25px 8px !important;
          background: linear-gradient(135deg, var(--device-card-1), var(--device-card-2)) !important;
          border-radius: 20px !important;
        }

        .message-bubble:has(.image-message-wrap).my-message-bubble,
        .message-bubble:has(.file-message-wrap).my-message-bubble {
          border-bottom-right-radius: 7px !important;
        }

        .message-bubble:has(.image-message-wrap).other-message-bubble,
        .message-bubble:has(.file-message-wrap).other-message-bubble {
          border-bottom-left-radius: 7px !important;
        }

        .device-source-chip {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          max-width: 100%;
          margin: 0 22px 6px 0;
          padding: 3px 8px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--device-accent) 13%, #ffffff);
          color: var(--device-accent);
          font-size: 9.5px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.35px;
          text-transform: uppercase;
        }

        .message-text,
        .image-description-text,
        .file-description-text {
          padding-bottom: 2px !important;
          margin-bottom: 0 !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }

        .message-text {
          padding-right: 2px !important;
          font-size: 15.5px !important;
          line-height: 1.45 !important;
          font-weight: 650 !important;
        }

        .image-message-wrap,
        .file-message-wrap {
          width: min(360px, 82vw) !important;
          max-width: 100% !important;
          background: transparent !important;
          border-radius: 16px !important;
          overflow: hidden !important;
        }

        .whatsapp-image-frame {
          width: 100% !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          background: rgba(255, 255, 255, 0.42) !important;
        }

        .message-image {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          max-height: 58dvh !important;
          object-fit: contain !important;
          border-radius: 16px !important;
          border: none !important;
          background: rgba(255,255,255,0.35) !important;
          box-shadow: none !important;
        }

        .image-description-text {
          width: 100% !important;
          max-width: 100% !important;
          padding: 8px 10px 2px !important;
          border-radius: 0 0 16px 16px !important;
          background: rgba(255,255,255,0.42) !important;
          font-size: 14.2px !important;
          line-height: 1.42 !important;
          transform: none !important;
        }

        .image-description-text::before {
          display: none !important;
        }

        .file-card {
          width: 100% !important;
          background: rgba(255,255,255,0.56) !important;
          border: 1px solid rgba(255,255,255,0.62) !important;
        }

        .message-time {
          position: absolute !important;
          right: 9px !important;
          bottom: 6px !important;
          z-index: 4 !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 3px !important;
          max-width: calc(100% - 18px) !important;
          padding: 2px 7px !important;
          border-radius: 999px !important;
          background: rgba(255, 255, 255, 0.72) !important;
          color: #475569 !important;
          box-shadow: 0 5px 14px rgba(15, 23, 42, 0.08) !important;
          font-size: 9.8px !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          white-space: nowrap !important;
        }

        .message-bubble:has(.message-image) .message-time,
        .message-bubble:has(.image-message-wrap) .message-time,
        .message-bubble:has(.file-message-wrap) .message-time {
          right: 10px !important;
          bottom: 7px !important;
          background: rgba(15, 23, 42, 0.68) !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }

        .message-dot-btn {
          top: 6px !important;
          right: 7px !important;
          z-index: 7 !important;
          background: rgba(255, 255, 255, 0.82) !important;
          color: #334155 !important;
          border: 1px solid rgba(255,255,255,0.7) !important;
        }

        .message-bubble:has(.message-image) .message-dot-btn,
        .message-bubble:has(.image-message-wrap) .message-dot-btn,
        .message-bubble:has(.file-message-wrap) .message-dot-btn {
          background: rgba(15,23,42,0.48) !important;
          color: #ffffff !important;
          border-color: rgba(255,255,255,0.26) !important;
        }

        .message-action-row {
          margin-top: 5px !important;
        }

        @media (max-width: 420px) {
          .message-bubble {
            max-width: min(91vw, 390px) !important;
          }

          .image-message-wrap,
          .file-message-wrap {
            width: min(342px, 84vw) !important;
          }
        }

        /* Clean professional centered chat UI - old to new date sequence */
        .nm-screen {
          overscroll-behavior: none !important;
        }

        .nm-phone {
          max-width: 460px !important;
          background: #eef7f4 !important;
        }

        .chat-body {
          padding: 14px 10px 108px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 0 !important;
          scroll-padding-top: 14px !important;
          overscroll-behavior: contain !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .note-block {
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }

        .date-separator {
          margin: 6px 0 10px !important;
        }

        .date-separator span {
          min-height: 24px !important;
          padding: 5px 12px !important;
          font-size: 10.5px !important;
          box-shadow: 0 7px 18px rgba(15, 23, 42, 0.12) !important;
        }

        .message-line,
        .message-line.my-message-line,
        .message-line.other-message-line {
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          margin: 0 0 9px !important;
        }

        .message-bubble,
        .message-bubble.my-message-bubble,
        .message-bubble.other-message-bubble {
          width: auto !important;
          max-width: min(82vw, 318px) !important;
          min-width: 70px !important;
          padding: 8px 32px 21px 11px !important;
          border-radius: 18px !important;
          background: linear-gradient(145deg, rgba(255,255,255,0.96), color-mix(in srgb, var(--device-card-1) 72%, #ffffff)) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.11) !important;
          text-align: left !important;
          overflow: visible !important;
        }

        .message-bubble::before {
          display: none !important;
        }

        .message-bubble.image-only,
        .message-bubble.file-only,
        .message-bubble:has(.image-message-wrap),
        .message-bubble:has(.file-message-wrap) {
          max-width: min(82vw, 300px) !important;
          padding: 7px 7px 24px !important;
          border-radius: 18px !important;
        }

        .message-text,
        .image-description-text,
        .file-description-text {
          font-size: 13px !important;
          line-height: 1.42 !important;
          font-weight: 520 !important;
          letter-spacing: 0 !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }

        .message-text div,
        .message-text p,
        .image-description-text div,
        .image-description-text p {
          margin: 0 !important;
          font-size: inherit !important;
          line-height: inherit !important;
        }

        .message-title-text {
          font-size: 14px !important;
          line-height: 1.35 !important;
          font-weight: 800 !important;
          text-align: center !important;
        }

        .device-source-chip {
          margin: 0 22px 5px 0 !important;
          padding: 3px 7px !important;
          font-size: 8.5px !important;
        }

        .image-message-wrap,
        .file-message-wrap {
          width: min(278px, 76vw) !important;
          max-width: 100% !important;
          border-radius: 15px !important;
        }

        .whatsapp-image-frame {
          border-radius: 15px !important;
          background: rgba(255,255,255,0.5) !important;
        }

        .message-image {
          width: 100% !important;
          max-height: 44dvh !important;
          object-fit: contain !important;
          border-radius: 15px !important;
        }

        .image-description-text {
          padding: 7px 9px 0 !important;
          background: rgba(255,255,255,0.5) !important;
        }

        .file-card {
          min-height: 56px !important;
          padding: 8px !important;
          grid-template-columns: 40px minmax(0, 1fr) 24px !important;
          gap: 8px !important;
          border-radius: 14px !important;
        }

        .file-type-badge {
          width: 40px !important;
          height: 40px !important;
          border-radius: 12px !important;
          font-size: 10px !important;
        }

        .file-info strong {
          font-size: 12px !important;
        }

        .file-info small {
          font-size: 10px !important;
        }

        .message-time {
          right: 8px !important;
          bottom: 5px !important;
          padding: 2px 6px !important;
          font-size: 9px !important;
          font-weight: 800 !important;
          opacity: 0.88 !important;
        }

        .message-dot-btn {
          top: 5px !important;
          right: 5px !important;
          width: 23px !important;
          height: 23px !important;
          font-size: 14px !important;
          border-radius: 9px !important;
        }

        .message-action-row {
          align-self: center !important;
          justify-content: center !important;
          margin: 4px auto 8px !important;
          max-width: min(88vw, 330px) !important;
        }

        .search-box {
          padding: 8px 11px !important;
        }

        .search-box input {
          height: 36px !important;
          font-size: 13px !important;
          font-weight: 650 !important;
        }

        .composer {
          padding: 8px 10px calc(8px + env(safe-area-inset-bottom)) !important;
          background: rgba(238, 247, 244, 0.9) !important;
          backdrop-filter: blur(14px) !important;
        }

        .composer-card {
          border-radius: 20px !important;
          box-shadow: 0 -4px 22px rgba(15,23,42,0.08), 0 12px 28px rgba(15,23,42,0.12) !important;
        }

        .text-input {
          min-height: 38px !important;
          max-height: 112px !important;
          padding: 9px 12px 11px !important;
          font-size: 13.5px !important;
          line-height: 1.4 !important;
          font-weight: 550 !important;
          outline: none !important;
          overflow-y: auto !important;
          caret-color: var(--composerColor, #111111) !important;
          -webkit-user-select: text !important;
          user-select: text !important;
          touch-action: manipulation !important;
        }

        .text-input:empty::before {
          font-size: 13px !important;
          color: #94a3b8 !important;
          font-weight: 600 !important;
        }

        .tool-btn,
        .send-btn {
          touch-action: manipulation !important;
        }

        @media (max-width: 380px) {
          .message-bubble,
          .message-bubble.my-message-bubble,
          .message-bubble.other-message-bubble {
            max-width: min(84vw, 292px) !important;
          }

          .image-message-wrap,
          .file-message-wrap {
            width: min(258px, 76vw) !important;
          }
        }


        /* =========================================================
           FINAL REQUEST UPDATE
           - Date sequence old to new
           - Card text very small
           - Times New Roman inside message cards
           - Exact date search like 26/06/2026 shows only that day
        ========================================================= */
        .chat-body {
          font-family: "Times New Roman", Times, serif !important;
        }

        .message-bubble,
        .message-bubble.my-message-bubble,
        .message-bubble.other-message-bubble {
          max-width: min(80vw, 300px) !important;
          padding: 7px 31px 20px 10px !important;
          border-radius: 17px !important;
          font-family: "Times New Roman", Times, serif !important;
        }

        .message-text,
        .image-description-text,
        .file-description-text,
        .message-text *,
        .image-description-text *,
        .file-description-text * {
          font-family: "Times New Roman", Times, serif !important;
          font-size: 12px !important;
          line-height: 1.34 !important;
          font-weight: 400 !important;
          letter-spacing: 0 !important;
        }

        .message-text b,
        .message-text strong,
        .image-description-text b,
        .image-description-text strong,
        .file-description-text b,
        .file-description-text strong {
          font-weight: 700 !important;
        }

        .message-title-text,
        .message-title-text * {
          font-family: "Times New Roman", Times, serif !important;
          font-size: 13px !important;
          line-height: 1.28 !important;
          font-weight: 700 !important;
        }

        .image-description-text {
          padding: 6px 8px 0 !important;
        }

        .message-bubble.image-only,
        .message-bubble.file-only,
        .message-bubble:has(.image-message-wrap),
        .message-bubble:has(.file-message-wrap) {
          max-width: min(80vw, 286px) !important;
          padding: 6px 6px 23px !important;
        }

        .image-message-wrap,
        .file-message-wrap {
          width: min(266px, 74vw) !important;
        }

        .message-time {
          font-family: "Times New Roman", Times, serif !important;
          font-size: 8.6px !important;
          font-weight: 700 !important;
        }

        .search-box input {
          font-family: "Times New Roman", Times, serif !important;
          font-size: 13px !important;
        }

        @media (max-width: 380px) {
          .message-bubble,
          .message-bubble.my-message-bubble,
          .message-bubble.other-message-bubble {
            max-width: min(82vw, 280px) !important;
          }

          .image-message-wrap,
          .file-message-wrap {
            width: min(248px, 73vw) !important;
          }
        }


        /* =========================================================
           FINAL COMPACT PROFESSIONAL NOTES UPDATE
           - Wrapped text starts exactly under first line
           - Compact card adjusts to text/image/file content
           - Times New Roman professional chat font
           - Right corner shows created time only
        ========================================================= */
        .chat-body {
          font-family: "Times New Roman", Times, serif !important;
        }

        .note-block {
          align-items: center !important;
        }

        .message-line,
        .message-line.my-message-line,
        .message-line.other-message-line {
          justify-content: center !important;
          align-items: center !important;
          margin: 0 0 7px !important;
        }

        .message-bubble,
        .message-bubble.my-message-bubble,
        .message-bubble.other-message-bubble {
          width: fit-content !important;
          max-width: min(74vw, 268px) !important;
          min-width: 0 !important;
          display: inline-block !important;
          box-sizing: border-box !important;
          padding: 7px 34px 17px 10px !important;
          border-radius: 16px !important;
          font-family: "Times New Roman", Times, serif !important;
          text-align: left !important;
          vertical-align: top !important;
        }

        .message-bubble.image-only,
        .message-bubble.file-only,
        .message-bubble:has(.image-message-wrap),
        .message-bubble:has(.file-message-wrap) {
          width: fit-content !important;
          max-width: min(74vw, 258px) !important;
          padding: 6px 6px 19px !important;
        }

        .message-text,
        .image-description-text,
        .file-description-text {
          display: block !important;
          width: auto !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          text-align: left !important;
          text-indent: 0 !important;
          white-space: pre-wrap !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
          font-family: "Times New Roman", Times, serif !important;
          font-size: 12.2px !important;
          line-height: 1.28 !important;
          font-weight: 400 !important;
          letter-spacing: 0 !important;
        }

        .message-text *,
        .image-description-text *,
        .file-description-text * {
          margin: 0 !important;
          padding: 0 !important;
          text-align: left !important;
          text-indent: 0 !important;
          white-space: inherit !important;
          font-family: "Times New Roman", Times, serif !important;
          font-size: inherit !important;
          line-height: inherit !important;
          letter-spacing: 0 !important;
        }

        .message-text p,
        .message-text div,
        .image-description-text p,
        .image-description-text div,
        .file-description-text p,
        .file-description-text div {
          display: block !important;
          margin-block: 0 !important;
          margin-inline: 0 !important;
          padding-block: 0 !important;
          padding-inline: 0 !important;
        }

        .message-text p + p,
        .message-text div + div,
        .image-description-text p + p,
        .image-description-text div + div,
        .file-description-text p + p,
        .file-description-text div + div {
          margin-top: 0 !important;
        }

        .message-text ul,
        .message-text ol,
        .image-description-text ul,
        .image-description-text ol,
        .file-description-text ul,
        .file-description-text ol {
          margin: 0 !important;
          padding-left: 15px !important;
        }

        .message-text b,
        .message-text strong,
        .image-description-text b,
        .image-description-text strong,
        .file-description-text b,
        .file-description-text strong {
          font-weight: 700 !important;
        }

        .message-title-text {
          text-align: left !important;
          font-family: "Times New Roman", Times, serif !important;
          font-size: 13px !important;
          line-height: 1.24 !important;
          font-weight: 500 !important;
        }

        .message-title-text .note-heading-line {
          display: inline !important;
          font-weight: 900 !important;
        }

        .message-title-text .note-heading-line * {
          font-weight: 900 !important;
        }

        .image-message-wrap,
        .file-message-wrap {
          width: auto !important;
          max-width: min(246px, 70vw) !important;
          display: block !important;
          border-radius: 14px !important;
        }

        .whatsapp-image-frame {
          width: fit-content !important;
          max-width: 100% !important;
          border-radius: 14px !important;
          overflow: hidden !important;
        }

        .message-image {
          display: block !important;
          width: auto !important;
          max-width: min(246px, 70vw) !important;
          height: auto !important;
          max-height: 36dvh !important;
          object-fit: contain !important;
          border-radius: 14px !important;
        }

        .image-description-text,
        .file-description-text {
          padding: 5px 2px 0 !important;
          background: transparent !important;
        }

        .file-card {
          width: min(246px, 70vw) !important;
          min-height: 52px !important;
          padding: 7px !important;
          grid-template-columns: 36px minmax(0, 1fr) 22px !important;
          gap: 7px !important;
          border-radius: 13px !important;
          font-family: "Times New Roman", Times, serif !important;
        }

        .file-type-badge {
          width: 36px !important;
          height: 36px !important;
          border-radius: 11px !important;
          font-size: 9.5px !important;
        }

        .file-info strong {
          font-family: "Times New Roman", Times, serif !important;
          font-size: 11.5px !important;
          line-height: 1.15 !important;
        }

        .file-info small {
          font-family: "Times New Roman", Times, serif !important;
          font-size: 9.2px !important;
          line-height: 1.15 !important;
        }

        .message-time {
          right: 7px !important;
          bottom: 5px !important;
          top: auto !important;
          min-width: auto !important;
          padding: 1px 5px !important;
          border-radius: 999px !important;
          font-family: "Times New Roman", Times, serif !important;
          font-size: 9.2px !important;
          line-height: 1.05 !important;
          font-weight: 700 !important;
          opacity: 0.9 !important;
          white-space: nowrap !important;
        }

        .message-time-temp {
          opacity: 0.62 !important;
        }

        .device-source-chip {
          margin: 0 24px 4px 0 !important;
          padding: 2px 7px !important;
          font-size: 8px !important;
          line-height: 1.2 !important;
        }

        @media (max-width: 380px) {
          .message-bubble,
          .message-bubble.my-message-bubble,
          .message-bubble.other-message-bubble {
            max-width: min(78vw, 248px) !important;
          }

          .message-bubble.image-only,
          .message-bubble.file-only,
          .message-bubble:has(.image-message-wrap),
          .message-bubble:has(.file-message-wrap) {
            max-width: min(76vw, 236px) !important;
          }

          .image-message-wrap,
          .file-message-wrap,
          .message-image,
          .file-card {
            max-width: min(232px, 68vw) !important;
          }
        }


        /* =========================================================
           FINAL REFERENCE TEXT CARD FIX
           Matches the uploaded WhatsApp reference style:
           - Text card is large and readable, not tiny
           - White professional card
           - Time stays small in the bottom-right corner
           - Image/file cards stay unchanged
        ========================================================= */

        .message-line:has(.message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap))) {
          width: 100% !important;
          display: flex !important;
          justify-content: flex-start !important;
          align-items: flex-start !important;
          padding: 0 10px !important;
          margin: 0 0 10px !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
          width: fit-content !important;
          max-width: min(88vw, 420px) !important;
          min-width: min(250px, calc(100vw - 34px)) !important;
          padding: 14px 42px 30px 17px !important;
          border-radius: 0 22px 22px 22px !important;
          background: #ffffff !important;
          border: 1px solid rgba(226, 232, 240, 0.92) !important;
          box-shadow:
            0 1px 1px rgba(15, 23, 42, 0.08),
            0 10px 28px rgba(15, 23, 42, 0.08) !important;
          overflow: visible !important;
          position: relative !important;
          text-align: left !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap))::before {
          display: none !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text *,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text div,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text p,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text span,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text font {
          font-family: "Times New Roman", Times, serif !important;
          font-size: clamp(16px, 4.35vw, 20px) !important;
          line-height: 1.58 !important;
          font-weight: 500 !important;
          letter-spacing: 0.12px !important;
          text-align: left !important;
          text-indent: 0 !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text b,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text strong {
          font-weight: 900 !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text u {
          text-decoration: underline !important;
          text-underline-offset: 4px !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-time {
          position: absolute !important;
          right: 12px !important;
          bottom: 8px !important;
          top: auto !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: #94a3b8 !important;
          font-family: "Times New Roman", Times, serif !important;
          font-size: 11px !important;
          line-height: 1 !important;
          font-weight: 700 !important;
          letter-spacing: 0.1px !important;
          opacity: 1 !important;
          white-space: nowrap !important;
          box-shadow: none !important;
          z-index: 5 !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-dot-btn {
          position: absolute !important;
          top: 7px !important;
          right: 8px !important;
          width: 22px !important;
          height: 22px !important;
          min-width: 22px !important;
          min-height: 22px !important;
          padding: 0 !important;
          border: none !important;
          border-radius: 50% !important;
          background: rgba(248, 250, 252, 0.9) !important;
          color: #64748b !important;
          box-shadow: none !important;
          font-size: 14px !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          z-index: 8 !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .device-source-chip {
          margin: 0 24px 8px 0 !important;
          padding: 3px 8px !important;
          border-radius: 999px !important;
          font-family: Inter, Arial, sans-serif !important;
          font-size: 9px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
        }

        .message-bubble:has(.message-title-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
          border-left: 4px solid #f97316 !important;
          background: #ffffff !important;
        }

        .message-bubble:has(.message-title-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-title-text {
          font-size: clamp(17px, 4.7vw, 21px) !important;
          line-height: 1.35 !important;
          font-weight: 500 !important;
          text-align: left !important;
        }

        .message-bubble:has(.message-title-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-title-text .note-heading-line,
        .message-bubble:has(.message-title-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-title-text .note-heading-line * {
          font-weight: 900 !important;
        }

        @media (max-width: 480px) {
          .message-line:has(.message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap))) {
            padding: 0 9px !important;
          }

          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
            max-width: calc(100vw - 24px) !important;
            min-width: min(285px, calc(100vw - 30px)) !important;
            padding: 14px 40px 30px 17px !important;
            border-radius: 0 22px 22px 22px !important;
          }

          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text,
          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text * {
            font-size: clamp(17px, 5vw, 20px) !important;
            line-height: 1.58 !important;
          }

          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-time {
            right: 12px !important;
            bottom: 8px !important;
            font-size: 11px !important;
          }
        }

        @media (max-width: 360px) {
          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
            max-width: calc(100vw - 18px) !important;
            min-width: min(270px, calc(100vw - 24px)) !important;
            padding: 13px 38px 29px 15px !important;
          }

          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text,
          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text * {
            font-size: 16.5px !important;
          }

          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-time {
            font-size: 10.5px !important;
          }
        }




        /* =========================================================
           FINAL ACTION UPDATE
           - Update/delete/title keep same scroll position
           - Small delete Yes/Cancel alert
           - Title button toggles Title/Normal
           - Pin note jump button goes directly to pinned text/image/file
        ========================================================= */
        .pinned-note-jump {
          flex: 0 0 auto !important;
          width: calc(100% - 18px) !important;
          max-width: 430px !important;
          min-height: 38px !important;
          margin: 7px auto 0 !important;
          padding: 7px 12px !important;
          border: 1px solid rgba(20, 184, 166, 0.24) !important;
          border-radius: 16px !important;
          background: rgba(255, 255, 255, 0.96) !important;
          color: #0f172a !important;
          display: grid !important;
          grid-template-columns: 24px auto minmax(0, 1fr) !important;
          align-items: center !important;
          gap: 7px !important;
          cursor: pointer !important;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.10) !important;
          z-index: 44 !important;
        }

        .pinned-note-jump:active {
          transform: scale(0.985) !important;
        }

        .pinned-note-icon {
          width: 24px !important;
          height: 24px !important;
          border-radius: 50% !important;
          background: #ccfbf1 !important;
          color: #0f766e !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 13px !important;
        }

        .pinned-note-label {
          color: #0f766e !important;
          font-size: 11px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.35px !important;
          white-space: nowrap !important;
        }

        .pinned-note-jump strong {
          min-width: 0 !important;
          color: #334155 !important;
          font-size: 12px !important;
          line-height: 1.15 !important;
          font-weight: 850 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          text-align: left !important;
        }

        .pinned-message-bubble {
          outline: 2px solid rgba(20, 184, 166, 0.34) !important;
          outline-offset: 2px !important;
        }

        .pinned-message-chip {
          position: absolute !important;
          top: 6px !important;
          left: 7px !important;
          width: 22px !important;
          height: 22px !important;
          border-radius: 999px !important;
          background: rgba(255, 255, 255, 0.86) !important;
          color: #0f766e !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 12px !important;
          z-index: 9 !important;
          box-shadow: 0 5px 14px rgba(15, 23, 42, 0.10) !important;
        }

        .pinned-message-bubble .device-source-chip {
          margin-left: 25px !important;
        }

        .pin-square {
          color: #0f766e !important;
          background: #ccfbf1 !important;
          border-color: #99f6e4 !important;
        }

        .pin-square.active-pin {
          color: #ffffff !important;
          background: linear-gradient(135deg, #0f766e, #14b8a6) !important;
          border-color: transparent !important;
        }

        .confirm-layer {
          z-index: 220 !important;
          align-items: center !important;
          justify-content: center !important;
          background: rgba(15, 23, 42, 0.12) !important;
          backdrop-filter: none !important;
          pointer-events: auto !important;
        }

        .confirm-card {
          width: auto !important;
          min-width: 188px !important;
          max-width: 230px !important;
          padding: 10px 11px !important;
          border-radius: 16px !important;
          background: rgba(255, 255, 255, 0.98) !important;
          border: 1px solid rgba(226, 232, 240, 0.95) !important;
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.18) !important;
          pointer-events: auto !important;
        }

        .confirm-card h3 {
          margin: 0 0 4px !important;
          font-size: 13px !important;
          line-height: 1.15 !important;
          font-weight: 950 !important;
          color: #111827 !important;
        }

        .confirm-card p {
          margin: 0 0 9px !important;
          color: #64748b !important;
          font-size: 11px !important;
          line-height: 1.25 !important;
          font-weight: 750 !important;
        }

        .confirm-actions {
          gap: 7px !important;
        }

        .confirm-actions button {
          height: 28px !important;
          border-radius: 999px !important;
          font-size: 11px !important;
          font-weight: 950 !important;
        }

        .cancel-confirm {
          background: #f1f5f9 !important;
          color: #475569 !important;
        }

        .delete-confirm {
          background: #dc2626 !important;
          color: #ffffff !important;
        }

        .message-action-row {
          z-index: 125 !important;
        }

        @media (max-width: 480px) {
          .pinned-note-jump {
            width: calc(100% - 16px) !important;
            min-height: 36px !important;
            margin-top: 6px !important;
            padding: 6px 10px !important;
            border-radius: 15px !important;
          }

          .pinned-note-jump strong {
            font-size: 11.5px !important;
          }

          .confirm-card {
            min-width: 176px !important;
            max-width: 214px !important;
            padding: 9px 10px !important;
          }
        }


        /* =========================================================
           FINAL USER REQUEST UPDATE
           - Hide New device text everywhere
           - Public channels show small ND chip only for other devices
           - Private channels show no device label
           - Text cards like reference image with less bottom empty space
           - WhatsApp-like composer: tool ball + left aligned input + round send
        ========================================================= */

        .device-source-chip {
          position: absolute !important;
          top: 8px !important;
          left: 9px !important;
          width: 22px !important;
          height: 22px !important;
          min-width: 22px !important;
          min-height: 22px !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 999px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: rgba(15, 118, 110, 0.10) !important;
          color: #0f766e !important;
          border: 1px solid rgba(15, 118, 110, 0.20) !important;
          font-family: Inter, Arial, sans-serif !important;
          font-size: 8.5px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          letter-spacing: 0 !important;
          text-transform: uppercase !important;
          z-index: 8 !important;
          box-shadow: none !important;
        }

        .message-bubble:has(.device-source-chip):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
          padding-top: 14px !important;
        }

        .message-bubble:has(.device-source-chip) .message-text {
          margin-top: 12px !important;
        }

        .pinned-message-bubble .device-source-chip {
          margin-left: 0 !important;
          left: 35px !important;
        }

        .chat-body {
          padding-bottom: 16px !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
          max-width: min(88vw, 560px) !important;
          min-width: min(255px, calc(100vw - 42px)) !important;
          padding: 13px 44px 23px 17px !important;
          border-radius: 0 20px 20px 20px !important;
          background: #ffffff !important;
          border: 1px solid rgba(226, 232, 240, 0.96) !important;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.10) !important;
          overflow: visible !important;
          text-align: left !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text *,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text div,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text p,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text span {
          font-family: "Times New Roman", Times, serif !important;
          font-size: clamp(16.5px, 4.55vw, 21px) !important;
          line-height: 1.46 !important;
          font-weight: 500 !important;
          letter-spacing: 0.08px !important;
          text-align: left !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-time {
          right: 10px !important;
          bottom: 6px !important;
          padding: 1px 5px !important;
          border-radius: 999px !important;
          background: transparent !important;
          color: #94a3b8 !important;
          font-family: "Times New Roman", Times, serif !important;
          font-size: 10.5px !important;
          line-height: 1 !important;
          font-weight: 700 !important;
          opacity: 0.95 !important;
          box-shadow: none !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-dot-btn {
          top: 6px !important;
          right: 7px !important;
          width: 22px !important;
          height: 22px !important;
          min-width: 22px !important;
          min-height: 22px !important;
          border-radius: 50% !important;
          background: rgba(241, 245, 249, 0.86) !important;
          color: #475569 !important;
          font-size: 14px !important;
        }

        .composer {
          padding: 5px 8px max(6px, env(safe-area-inset-bottom)) !important;
          background: rgba(240, 242, 245, 0.98) !important;
          border-top: 1px solid rgba(203, 213, 225, 0.76) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
        }

        .composer-card {
          width: 100% !important;
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          overflow: visible !important;
          max-height: none !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 5px !important;
        }

        .composer-tools-top {
          width: 100% !important;
          min-height: 28px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 7px !important;
          padding: 0 2px !important;
        }

        .tools-ball-btn {
          width: 25px !important;
          height: 25px !important;
          min-width: 25px !important;
          min-height: 25px !important;
          border: none !important;
          border-radius: 999px !important;
          background: linear-gradient(135deg, #0f766e, #0ea5e9) !important;
          color: #ffffff !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          cursor: pointer !important;
          box-shadow: 0 7px 16px rgba(14, 165, 233, 0.24) !important;
          flex: 0 0 auto !important;
        }

        .tools-ball-btn span,
        .tools-ball-btn span::before,
        .tools-ball-btn span::after {
          width: 4px !important;
          height: 4px !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          display: block !important;
          content: "" !important;
          position: relative !important;
        }

        .tools-ball-btn span::before {
          position: absolute !important;
          left: -7px !important;
          top: 0 !important;
        }

        .tools-ball-btn span::after {
          position: absolute !important;
          left: 7px !important;
          top: 0 !important;
        }

        .tools-ball-btn.active {
          background: linear-gradient(135deg, #ea580c, #f97316) !important;
        }

        .composer-tools-popover {
          min-height: 30px !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 3px 6px !important;
          border-radius: 999px !important;
          background: rgba(255, 255, 255, 0.96) !important;
          border: 1px solid rgba(226, 232, 240, 0.9) !important;
          box-shadow: 0 9px 24px rgba(15, 23, 42, 0.12) !important;
          animation: composerToolsIn 0.16s ease both !important;
          overflow-x: auto !important;
          max-width: calc(100vw - 52px) !important;
          scrollbar-width: none !important;
        }

        .composer-tools-popover::-webkit-scrollbar {
          display: none !important;
        }

        @keyframes composerToolsIn {
          from {
            opacity: 0;
            transform: translateX(-5px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .composer-tools-popover .tool-btn {
          width: 27px !important;
          height: 27px !important;
          min-width: 27px !important;
          border-radius: 999px !important;
          font-size: 11px !important;
          box-shadow: none !important;
        }

        .composer-tools-popover .tool-icon {
          max-width: 18px !important;
          max-height: 18px !important;
        }

        .composer-input-row {
          width: 100% !important;
          display: flex !important;
          align-items: flex-end !important;
          gap: 7px !important;
        }

        .composer-input-row .text-input {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          min-height: 40px !important;
          max-height: 112px !important;
          margin: 0 !important;
          padding: 10px 13px !important;
          border: 1px solid rgba(203, 213, 225, 0.90) !important;
          border-radius: 20px !important;
          background: #ffffff !important;
          color: var(--composerColor, #111111) !important;
          -webkit-text-fill-color: var(--composerColor, #111111) !important;
          caret-color: var(--composerColor, #111111) !important;
          font-family: Inter, Arial, sans-serif !important;
          font-size: 14px !important;
          line-height: 1.38 !important;
          font-weight: 550 !important;
          text-align: left !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          overflow-y: auto !important;
          outline: none !important;
          box-shadow: none !important;
          display: block !important;
          direction: ltr !important;
        }

        .composer-input-row .text-input *,
        .composer-input-row .text-input div,
        .composer-input-row .text-input p,
        .composer-input-row .text-input span,
        .composer-input-row .text-input font {
          text-align: left !important;
          margin: 0 !important;
          padding: 0 !important;
          white-space: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
        }

        .composer-input-row .text-input:empty::before {
          color: #94a3b8 !important;
          -webkit-text-fill-color: #94a3b8 !important;
          font-weight: 600 !important;
          text-align: left !important;
        }

        .composer-input-row .send-btn {
          width: 42px !important;
          height: 42px !important;
          min-width: 42px !important;
          min-height: 42px !important;
          border-radius: 999px !important;
          padding: 0 !important;
          margin: 0 !important;
          background: linear-gradient(135deg, #0f766e, #0ea5e9) !important;
          color: #ffffff !important;
          font-size: 17px !important;
          line-height: 1 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 8px 20px rgba(14, 165, 233, 0.25) !important;
          flex: 0 0 auto !important;
        }

        @media (max-width: 480px) {
          .chat-body {
            padding-bottom: 12px !important;
          }

          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
            max-width: calc(100vw - 22px) !important;
            min-width: min(285px, calc(100vw - 30px)) !important;
            padding: 13px 42px 23px 17px !important;
          }

          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text,
          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text * {
            font-size: clamp(16.8px, 4.9vw, 20px) !important;
            line-height: 1.46 !important;
          }

          .composer {
            padding-left: 7px !important;
            padding-right: 7px !important;
          }

          .composer-input-row .text-input {
            min-height: 39px !important;
            padding: 9px 12px !important;
            font-size: 13.5px !important;
          }

          .composer-input-row .send-btn {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            min-height: 40px !important;
          }
        }



        /* =========================================================
           FINAL REQUEST UPDATE 2
           - Global Poppins professional font
           - Text card smaller, stylish, and compact
           - More breathing space between message cards
           - Slight new-message effect
           - Composer input slightly taller with blue border
           - Header logo/title box orange-red professional border
        ========================================================= */

        .nm-screen,
        .nm-phone,
        .nm-header,
        .header-brand-row,
        .chat-body,
        .composer,
        .composer-card,
        .text-input,
        .message-bubble,
        .message-text,
        .image-description-text,
        .file-description-text,
        .message-time,
        .date-separator,
        .search-box,
        .toast,
        .confirm-card,
        button,
        input {
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
        }

        .chat-body {
          gap: 0 !important;
          padding-top: 13px !important;
          padding-bottom: 18px !important;
        }

        .note-block {
          margin: 0 0 4px !important;
        }

        .message-line,
        .message-line.my-message-line,
        .message-line.other-message-line {
          margin: 0 0 15px !important;
          padding: 0 9px !important;
          animation: softMessageEntry 0.18s ease both !important;
        }

        @keyframes softMessageEntry {
          from {
            opacity: 0.72;
            transform: translateY(5px) scale(0.992);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
          width: fit-content !important;
          max-width: min(82vw, 500px) !important;
          min-width: min(225px, calc(100vw - 72px)) !important;
          padding: 11px 39px 21px 14px !important;
          border-radius: 18px !important;
          background:
            linear-gradient(145deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96)) !important;
          border: 1px solid rgba(226, 232, 240, 0.98) !important;
          box-shadow:
            0 7px 20px rgba(15, 23, 42, 0.085),
            inset 0 1px 0 rgba(255,255,255,0.95) !important;
          overflow: visible !important;
          text-align: left !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text *,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text div,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text p,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text span {
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
          font-size: clamp(13.6px, 3.65vw, 15.4px) !important;
          line-height: 1.52 !important;
          font-weight: 500 !important;
          letter-spacing: 0.12px !important;
          text-align: left !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text b,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text strong {
          font-weight: 850 !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-time {
          right: 9px !important;
          bottom: 5px !important;
          padding: 1px 5px !important;
          border-radius: 999px !important;
          background: rgba(248,250,252,0.84) !important;
          color: #94a3b8 !important;
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
          font-size: 8.8px !important;
          line-height: 1 !important;
          font-weight: 700 !important;
          opacity: 0.95 !important;
          box-shadow: none !important;
        }

        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-dot-btn {
          top: 5px !important;
          right: 6px !important;
          width: 21px !important;
          height: 21px !important;
          min-width: 21px !important;
          min-height: 21px !important;
          border-radius: 999px !important;
          background: rgba(241, 245, 249, 0.90) !important;
          color: #64748b !important;
          font-size: 13px !important;
        }

        .message-bubble.image-only,
        .message-bubble.file-only,
        .message-bubble:has(.image-message-wrap),
        .message-bubble:has(.file-message-wrap) {
          margin-bottom: 2px !important;
        }

        .header-brand-row {
          border: 1.8px solid rgba(249, 115, 22, 0.82) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            0 0 0 1px rgba(220, 38, 38, 0.16),
            0 9px 24px rgba(194, 65, 12, 0.18) !important;
        }

        .header-brand-row .header-logo,
        .header-logo {
          border: 2px solid rgba(234, 88, 12, 0.95) !important;
          box-shadow:
            0 9px 22px rgba(194, 65, 12, 0.23),
            inset 0 0 0 2px rgba(255, 255, 255, 0.76) !important;
        }

        .header-brand-row .header-title h2 {
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
          font-weight: 900 !important;
          letter-spacing: 0.18px !important;
        }

        .header-brand-row .header-title p {
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
          font-weight: 700 !important;
        }

        .composer {
          padding: 7px 8px max(8px, env(safe-area-inset-bottom)) !important;
        }

        .composer-input-row {
          gap: 8px !important;
          align-items: flex-end !important;
        }

        .composer-input-row .text-input {
          min-height: 45px !important;
          max-height: 124px !important;
          padding: 11px 14px !important;
          border: 1.6px solid rgba(37, 99, 235, 0.56) !important;
          border-radius: 21px !important;
          background: #ffffff !important;
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
          font-size: 14.2px !important;
          line-height: 1.46 !important;
          font-weight: 500 !important;
          box-shadow:
            0 0 0 3px rgba(37, 99, 235, 0.07),
            0 5px 14px rgba(15, 23, 42, 0.06) !important;
        }

        .composer-input-row .text-input:focus,
        .composer-input-row .text-input:focus-visible {
          border-color: rgba(37, 99, 235, 0.90) !important;
          box-shadow:
            0 0 0 3px rgba(37, 99, 235, 0.13),
            0 7px 18px rgba(37, 99, 235, 0.10) !important;
        }

        .composer-input-row .text-input *,
        .composer-input-row .text-input div,
        .composer-input-row .text-input p,
        .composer-input-row .text-input span,
        .composer-input-row .text-input font {
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
          font-size: inherit !important;
          line-height: inherit !important;
          text-align: left !important;
        }

        .composer-input-row .send-btn {
          width: 43px !important;
          height: 43px !important;
          min-width: 43px !important;
          min-height: 43px !important;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.24) !important;
        }

        .tools-ball-btn {
          border: 1px solid rgba(255,255,255,0.68) !important;
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22) !important;
        }

        @media (max-width: 480px) {
          .message-line,
          .message-line.my-message-line,
          .message-line.other-message-line {
            margin-bottom: 14px !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }

          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
            max-width: calc(100vw - 46px) !important;
            min-width: min(232px, calc(100vw - 70px)) !important;
            padding: 11px 37px 21px 14px !important;
          }

          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text,
          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text * {
            font-size: clamp(13.8px, 3.95vw, 15.2px) !important;
            line-height: 1.53 !important;
          }

          .composer-input-row .text-input {
            min-height: 44px !important;
            padding: 10px 13px !important;
            font-size: 14px !important;
          }

          .composer-input-row .send-btn {
            width: 42px !important;
            height: 42px !important;
            min-width: 42px !important;
            min-height: 42px !important;
          }
        }

        @media (max-width: 360px) {
          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
            max-width: calc(100vw - 36px) !important;
            min-width: min(215px, calc(100vw - 58px)) !important;
            padding: 10px 35px 20px 13px !important;
          }
        }


        /* =========================================================
           FINAL EXACT CHAT CARD UPDATE
           - Same soft grey card for text and image
           - Compact spacing like reference image
           - Small time at right corner
           - ND chip only in corner, never above/over text
           - Tap image to open centered full preview with X close
        ========================================================= */

        .chat-body {
          padding: 12px 8px 12px !important;
          background: #ffffff !important;
          align-items: center !important;
        }

        .message-line,
        .message-line.my-message-line,
        .message-line.other-message-line {
          width: 100% !important;
          justify-content: center !important;
          align-items: center !important;
          padding: 0 6px !important;
          margin: 0 0 12px !important;
        }

        .message-bubble,
        .message-bubble.my-message-bubble,
        .message-bubble.other-message-bubble,
        .message-bubble.image-only,
        .message-bubble.file-only,
        .message-bubble:has(.image-message-wrap),
        .message-bubble:has(.file-message-wrap),
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
          width: fit-content !important;
          max-width: min(82vw, 330px) !important;
          min-width: 0 !important;
          padding: 12px 38px 22px 16px !important;
          border-radius: 22px !important;
          background: #f4f4f4 !important;
          border: none !important;
          box-shadow: none !important;
          overflow: visible !important;
          text-align: left !important;
        }

        .message-bubble:has(.image-message-wrap),
        .message-bubble.image-only {
          padding: 8px 8px 23px 8px !important;
          max-width: min(86vw, 355px) !important;
        }

        .message-bubble:has(.device-source-chip):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
          padding-left: 44px !important;
          padding-top: 12px !important;
        }

        .message-bubble:has(.device-source-chip) .message-text {
          margin-top: 0 !important;
        }

        .device-source-chip {
          position: absolute !important;
          top: 8px !important;
          left: 9px !important;
          width: 24px !important;
          height: 24px !important;
          min-width: 24px !important;
          min-height: 24px !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 999px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #ffffff !important;
          color: #6b7280 !important;
          border: 1px solid #d6d6d6 !important;
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
          font-size: 8px !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: 0 !important;
          z-index: 8 !important;
          box-shadow: none !important;
        }

        .message-text,
        .message-text *,
        .message-text div,
        .message-text p,
        .message-text span,
        .image-description-text,
        .image-description-text *,
        .file-description-text,
        .file-description-text * {
          font-family: "Comic Sans MS", "Patrick Hand", "Segoe Print", cursive !important;
          font-size: clamp(18px, 4.7vw, 24px) !important;
          line-height: 1.65 !important;
          font-weight: 500 !important;
          letter-spacing: 1.6px !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .image-message-wrap,
        .file-message-wrap {
          width: min(335px, 82vw) !important;
          max-width: 100% !important;
          border-radius: 18px !important;
          background: transparent !important;
          overflow: visible !important;
        }

        .whatsapp-image-frame {
          width: 100% !important;
          max-height: 58dvh !important;
          border-radius: 18px !important;
          overflow: hidden !important;
          background: transparent !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .whatsapp-image-frame .message-image,
        .message-image {
          width: 100% !important;
          max-width: 100% !important;
          max-height: 58dvh !important;
          height: auto !important;
          object-fit: contain !important;
          object-position: center center !important;
          border-radius: 18px !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          cursor: zoom-in !important;
          display: block !important;
        }

        .image-description-text {
          width: 100% !important;
          max-width: 100% !important;
          margin-top: 8px !important;
          padding: 0 2px 0 2px !important;
          border-radius: 0 !important;
          background: transparent !important;
          border: none !important;
          transform: none !important;
        }

        .image-description-text::before,
        .file-description-text::before {
          display: none !important;
        }

        .message-time,
        .message-bubble:has(.message-image) .message-time,
        .message-bubble:has(.image-message-wrap) .message-time,
        .message-bubble:has(.file-message-wrap) .message-time,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-time {
          position: absolute !important;
          right: 12px !important;
          bottom: 7px !important;
          padding: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: #8a8a8a !important;
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
          font-size: 9px !important;
          line-height: 1 !important;
          font-weight: 700 !important;
          opacity: 0.9 !important;
          box-shadow: none !important;
          z-index: 9 !important;
        }

        .message-dot-btn,
        .message-bubble:has(.image-message-wrap) .message-dot-btn,
        .message-bubble:has(.file-message-wrap) .message-dot-btn,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-dot-btn {
          top: 7px !important;
          right: 8px !important;
          width: 22px !important;
          height: 22px !important;
          min-width: 22px !important;
          min-height: 22px !important;
          border-radius: 999px !important;
          background: transparent !important;
          color: #6b7280 !important;
          border: none !important;
          font-size: 16px !important;
          box-shadow: none !important;
          z-index: 10 !important;
        }

        .message-text,
        .image-description-text,
        .file-description-text {
          font-family: "Patrick Hand", "Comic Sans MS", "Comic Sans", "Comic Neue", "Segoe Print", cursive !important;
          font-size: clamp(17px, 4.55vw, 22px) !important;
        }

        .message-text [style*="color"],
        .message-text [style*="-webkit-text-fill-color"],
        .image-description-text [style*="color"],
        .image-description-text [style*="-webkit-text-fill-color"],
        .file-description-text [style*="color"],
        .file-description-text [style*="-webkit-text-fill-color"] {
          -webkit-text-fill-color: inherit;
        }

        .text-input,
        .text-input *,
        .text-input div,
        .text-input p,
        .text-input span {
          font-family: "Patrick Hand", "Comic Sans MS", "Comic Sans", "Comic Neue", "Segoe Print", cursive !important;
          font-size: clamp(17px, 4.55vw, 22px) !important;
          line-height: 1.54 !important;
          letter-spacing: 1.35px !important;
        }

        .message-title-text,
        .message-title-text * {
          font-family: "Patrick Hand", "Comic Sans MS", "Comic Sans", "Comic Neue", "Segoe Print", cursive !important;
        }

        .image-description-text::before,
        .file-description-text::before {
          display: none !important;
          content: none !important;
        }

        .image-viewer-overlay {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 22px !important;
          background: rgba(0, 0, 0, 0.86) !important;
        }

        .image-viewer-img {
          max-width: 100% !important;
          max-height: 88dvh !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
          object-position: center center !important;
          border-radius: 14px !important;
          display: block !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35) !important;
        }

        .image-viewer-close {
          position: fixed !important;
          top: max(14px, env(safe-area-inset-top)) !important;
          right: 16px !important;
          width: 36px !important;
          height: 36px !important;
          border: none !important;
          border-radius: 999px !important;
          background: rgba(255, 255, 255, 0.95) !important;
          color: #111111 !important;
          font-size: 26px !important;
          line-height: 1 !important;
          font-weight: 700 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          z-index: 10000 !important;
        }

        @media (max-width: 480px) {
          .message-bubble,
          .message-bubble.my-message-bubble,
          .message-bubble.other-message-bubble,
          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
            max-width: calc(100vw - 34px) !important;
            padding: 11px 36px 20px 15px !important;
          }

          .message-bubble:has(.image-message-wrap),
          .message-bubble.image-only {
            max-width: calc(100vw - 34px) !important;
            padding: 7px 7px 22px !important;
          }

          .message-text,
          .message-text *,
          .image-description-text,
          .image-description-text * {
            font-size: clamp(17px, 5.25vw, 22px) !important;
            line-height: 1.58 !important;
          }
        }


        /* FINAL FIX 2026-06-29: requested exact chat look, header tap pop, ND placement, title persistence, and bold/underline visibility */
        .nm-header {
          background: linear-gradient(135deg, #eef4ff 0%, #f8fbff 42%, #f4f0ff 100%) !important;
          border-bottom: 1px solid rgba(99, 102, 241, 0.13) !important;
          box-shadow: 0 10px 30px rgba(30, 41, 59, 0.08) !important;
        }

        .header-brand-row {
          border: 1px solid rgba(99, 102, 241, 0.13) !important;
          background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(238,242,255,0.92)) !important;
          box-shadow: 0 10px 22px rgba(79, 70, 229, 0.10) !important;
          cursor: pointer !important;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease !important;
          -webkit-tap-highlight-color: transparent !important;
        }

        .header-brand-row:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 14px 26px rgba(79, 70, 229, 0.14) !important;
        }

        .header-brand-row.brand-pop {
          animation: tinyHeaderPop 0.42s cubic-bezier(.2,.8,.2,1) !important;
        }

        @keyframes tinyHeaderPop {
          0% { transform: scale(1); }
          35% { transform: scale(1.035) translateY(-1px); }
          70% { transform: scale(0.992); }
          100% { transform: scale(1); }
        }

        .header-brand-row .header-logo {
          background: linear-gradient(135deg, #4f46e5, #06b6d4) !important;
          border: 2px solid rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 10px 22px rgba(79, 70, 229, 0.24) !important;
        }

        .header-brand-row .logo-fallback-letter {
          color: #ffffff !important;
          font-weight: 900 !important;
        }

        .header-brand-row .header-title h2 {
          color: #172554 !important;
          font-weight: 900 !important;
        }

        .header-brand-row .header-title p {
          color: #475569 !important;
          font-weight: 700 !important;
        }

        .message-bubble.new-device-message,
        .message-bubble:has(.device-source-chip) {
          margin-top: 15px !important;
          padding-top: 18px !important;
        }

        .message-bubble.new-device-message:not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble:has(.device-source-chip):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
          padding-left: 16px !important;
          padding-top: 24px !important;
        }

        .device-source-chip {
          top: -13px !important;
          left: 14px !important;
          width: 30px !important;
          height: 22px !important;
          min-width: 30px !important;
          min-height: 22px !important;
          border-radius: 999px !important;
          background: linear-gradient(135deg, #ffffff, #f1f5f9) !important;
          color: #2563eb !important;
          border: 1px solid rgba(37, 99, 235, 0.22) !important;
          box-shadow: 0 5px 14px rgba(30, 64, 175, 0.13) !important;
          font-size: 9px !important;
          z-index: 20 !important;
          pointer-events: none !important;
        }

        .message-text,
        .message-text *,
        .image-description-text,
        .image-description-text *,
        .file-description-text,
        .file-description-text *,
        .text-input,
        .text-input * {
          font-family: "Comic Sans MS", "Comic Sans", "Comic Neue", "Segoe Print", cursive !important;
          letter-spacing: 1.4px !important;
        }

        .message-text,
        .message-text *,
        .image-description-text,
        .image-description-text *,
        .file-description-text,
        .file-description-text * {
        }

        .message-text b,
        .message-text strong,
        .message-text span[style*="font-weight: bold"],
        .message-text span[style*="font-weight: 700"],
        .message-text span[style*="font-weight: 800"],
        .image-description-text b,
        .image-description-text strong,
        .image-description-text span[style*="font-weight: bold"],
        .image-description-text span[style*="font-weight: 700"],
        .image-description-text span[style*="font-weight: 800"],
        .file-description-text b,
        .file-description-text strong,
        .file-description-text span[style*="font-weight: bold"],
        .file-description-text span[style*="font-weight: 700"],
        .file-description-text span[style*="font-weight: 800"],
        .text-input b,
        .text-input strong,
        .text-input span[style*="font-weight: bold"],
        .text-input span[style*="font-weight: 700"],
        .text-input span[style*="font-weight: 800"] {
          font-weight: 900 !important;
        }

        .message-text u,
        .message-text span[style*="text-decoration-line: underline"],
        .message-text span[style*="text-decoration: underline"],
        .image-description-text u,
        .image-description-text span[style*="text-decoration-line: underline"],
        .image-description-text span[style*="text-decoration: underline"],
        .file-description-text u,
        .file-description-text span[style*="text-decoration-line: underline"],
        .file-description-text span[style*="text-decoration: underline"],
        .text-input u,
        .text-input span[style*="text-decoration-line: underline"],
        .text-input span[style*="text-decoration: underline"] {
          text-decoration: underline !important;
          text-decoration-thickness: 1.6px !important;
          text-underline-offset: 4px !important;
        }

        .image-viewer-overlay {
          padding: 52px 18px 26px !important;
          background: rgba(0, 0, 0, 0.88) !important;
        }

        .image-viewer-box {
          position: relative !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          max-width: min(96vw, 900px) !important;
          max-height: 86dvh !important;
          animation: imageOpenPop 0.22s ease-out both !important;
        }

        @keyframes imageOpenPop {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .image-viewer-img {
          max-width: min(96vw, 900px) !important;
          max-height: 82dvh !important;
          border-radius: 16px !important;
        }

        .image-viewer-close {
          position: absolute !important;
          top: -44px !important;
          right: 2px !important;
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
          min-height: 34px !important;
          background: rgba(255, 255, 255, 0.97) !important;
          color: #0f172a !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.22) !important;
        }

        .title-bubble .message-time {
          right: 12px !important;
          bottom: 7px !important;
        }

        /* FINAL SAME SIZE + ONE ND + HEADER BACK FIX */
        .nm-header {
          background: linear-gradient(135deg, #eef4ff 0%, #ffffff 50%, #f8fafc 100%) !important;
        }

        .header-icon-btn.back-btn {
          color: #050505 !important;
          background: rgba(255, 255, 255, 0.92) !important;
          border: 1px solid rgba(15, 23, 42, 0.15) !important;
          box-shadow: 0 7px 18px rgba(15, 23, 42, 0.13) !important;
          font-size: 30px !important;
          font-weight: 900 !important;
          line-height: 1 !important;
        }

        .header-icon-btn.back-btn:hover,
        .header-icon-btn.back-btn:active {
          color: #000000 !important;
          background: #ffffff !important;
          transform: scale(0.96) !important;
        }

        .header-brand-row {
          border: 1.8px solid rgba(220, 38, 38, 0.82) !important;
          outline: 1px solid rgba(248, 113, 113, 0.22) !important;
          outline-offset: 2px !important;
          background: linear-gradient(135deg, #ffffff 0%, #fff7ed 48%, #eef2ff 100%) !important;
          box-shadow:
            0 10px 24px rgba(185, 28, 28, 0.12),
            0 2px 0 rgba(255, 255, 255, 0.95) inset !important;
        }

        .header-brand-row .header-logo,
        .header-logo {
          border: 1px solid rgba(255, 255, 255, 0.95) !important;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14) !important;
        }

        .chat-body {
          padding: 12px 8px 14px !important;
          background: #ffffff !important;
          align-items: center !important;
        }

        .message-line,
        .message-line.my-message-line,
        .message-line.other-message-line {
          width: 100% !important;
          justify-content: center !important;
          align-items: center !important;
          padding: 0 8px !important;
          margin: 0 0 12px !important;
        }

        .message-bubble,
        .message-bubble.my-message-bubble,
        .message-bubble.other-message-bubble,
        .message-bubble.image-only,
        .message-bubble.file-only,
        .message-bubble:has(.image-message-wrap),
        .message-bubble:has(.file-message-wrap),
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
          width: fit-content !important;
          max-width: min(86vw, 350px) !important;
          min-width: 0 !important;
          padding: 11px 38px 21px 16px !important;
          border-radius: 22px !important;
          background: #f4f4f4 !important;
          border: none !important;
          box-shadow: none !important;
          overflow: visible !important;
          text-align: left !important;
        }

        .message-bubble:has(.image-message-wrap),
        .message-bubble.image-only {
          max-width: min(86vw, 350px) !important;
          padding: 8px 8px 22px 8px !important;
        }

        .image-message-wrap,
        .file-message-wrap {
          width: fit-content !important;
          max-width: min(82vw, 334px) !important;
          border-radius: 18px !important;
          background: transparent !important;
        }

        .whatsapp-image-frame {
          width: fit-content !important;
          max-width: min(82vw, 334px) !important;
          max-height: 48dvh !important;
          border-radius: 18px !important;
          overflow: hidden !important;
          background: transparent !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .whatsapp-image-frame .message-image,
        .message-image {
          width: auto !important;
          max-width: min(82vw, 334px) !important;
          max-height: 48dvh !important;
          height: auto !important;
          object-fit: contain !important;
          object-position: center center !important;
          border-radius: 18px !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          cursor: zoom-in !important;
          display: block !important;
        }

        .message-text,
        .message-text *,
        .message-text div,
        .message-text p,
        .message-text span,
        .image-description-text,
        .image-description-text *,
        .file-description-text,
        .file-description-text * {
          font-family: "Patrick Hand", "Comic Sans MS", "Comic Sans", "Comic Neue", "Segoe Print", cursive !important;
          font-size: clamp(17px, 4.55vw, 22px) !important;
          line-height: 1.54 !important;
          font-weight: 500 !important;
          letter-spacing: 1.35px !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .image-description-text,
        .file-description-text {
          width: auto !important;
          max-width: min(82vw, 334px) !important;
          margin-top: 7px !important;
          padding: 0 2px !important;
          background: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          transform: none !important;
        }

        .message-text b,
        .message-text strong,
        .message-text b *,
        .message-text strong *,
        .message-text span[style*="font-weight"],
        .image-description-text b,
        .image-description-text strong,
        .image-description-text span[style*="font-weight"],
        .file-description-text b,
        .file-description-text strong,
        .file-description-text span[style*="font-weight"],
        .text-input b,
        .text-input strong,
        .text-input span[style*="font-weight"] {
          font-size: inherit !important;
          line-height: inherit !important;
          letter-spacing: inherit !important;
          margin: 0 !important;
          padding: 0 !important;
          font-weight: 850 !important;
        }

        .message-text u,
        .message-text u *,
        .message-text span[style*="underline"],
        .image-description-text u,
        .image-description-text span[style*="underline"],
        .file-description-text u,
        .file-description-text span[style*="underline"],
        .text-input u,
        .text-input span[style*="underline"] {
          font-size: inherit !important;
          line-height: inherit !important;
          letter-spacing: inherit !important;
          margin: 0 !important;
          padding: 0 !important;
          text-decoration: underline !important;
          text-decoration-thickness: 1.5px !important;
          text-underline-offset: 4px !important;
        }

        .message-bubble.new-device-message,
        .message-bubble:has(.device-source-chip) {
          margin-top: 15px !important;
        }

        .message-bubble.new-device-message:not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
        .message-bubble:has(.device-source-chip):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
          padding-left: 16px !important;
          padding-top: 24px !important;
        }

        .message-bubble.new-device-message:has(.image-message-wrap),
        .message-bubble:has(.device-source-chip):has(.image-message-wrap) {
          padding-top: 20px !important;
        }

        .device-source-chip {
          position: absolute !important;
          top: -12px !important;
          left: 14px !important;
          width: 31px !important;
          height: 22px !important;
          min-width: 31px !important;
          min-height: 22px !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          color: #2563eb !important;
          border: 1px solid rgba(37, 99, 235, 0.24) !important;
          box-shadow: 0 5px 14px rgba(30, 64, 175, 0.14) !important;
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
          font-size: 9px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          letter-spacing: 0 !important;
          z-index: 20 !important;
          pointer-events: none !important;
        }

        .message-time,
        .message-bubble:has(.message-image) .message-time,
        .message-bubble:has(.image-message-wrap) .message-time,
        .message-bubble:has(.file-message-wrap) .message-time,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-time {
          position: absolute !important;
          right: 12px !important;
          bottom: 7px !important;
          padding: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: #8a8a8a !important;
          font-family: "Poppins", "Inter", "Segoe UI", Arial, sans-serif !important;
          font-size: 9px !important;
          line-height: 1 !important;
          font-weight: 700 !important;
          opacity: 0.9 !important;
          box-shadow: none !important;
          z-index: 9 !important;
        }

        .image-viewer-overlay {
          padding: 52px 18px 26px !important;
          background: rgba(0, 0, 0, 0.88) !important;
          overflow: hidden !important;
          touch-action: none !important;
          overscroll-behavior: contain !important;
        }

        .image-viewer-box {
          position: relative !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          max-width: min(96vw, 900px) !important;
          max-height: 86dvh !important;
          animation: imageOpenPop 0.22s ease-out both !important;
          overflow: visible !important;
          touch-action: none !important;
        }

        .image-viewer-img {
          max-width: min(96vw, 900px) !important;
          max-height: 82dvh !important;
          border-radius: 16px !important;
          transform-origin: center center !important;
          transition: transform 0.08s ease-out !important;
          touch-action: none !important;
          user-select: none !important;
          -webkit-user-drag: none !important;
          cursor: zoom-in !important;
        }

        .image-viewer-close {
          position: absolute !important;
          top: -42px !important;
          right: 0 !important;
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
          min-height: 34px !important;
          background: rgba(255, 255, 255, 0.97) !important;
          color: #0f172a !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.22) !important;
        }

        @media (max-width: 480px) {
          .message-bubble,
          .message-bubble.my-message-bubble,
          .message-bubble.other-message-bubble,
          .message-bubble.image-only,
          .message-bubble.file-only,
          .message-bubble:has(.image-message-wrap),
          .message-bubble:has(.file-message-wrap),
          .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.my-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)),
          .message-bubble.other-message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) {
            max-width: calc(100vw - 34px) !important;
          }

          .whatsapp-image-frame,
          .whatsapp-image-frame .message-image,
          .message-image,
          .image-message-wrap,
          .file-message-wrap {
            max-width: calc(100vw - 52px) !important;
          }

          .message-text,
          .message-text *,
          .image-description-text,
          .image-description-text *,
          .file-description-text,
          .file-description-text * {
            font-size: clamp(17px, 5.05vw, 21px) !important;
            line-height: 1.52 !important;
          }
        }


        /* Final note text rules: normal text, image description, and file description look identical. */
        .message-text,
        .image-description-text,
        .file-description-text {
          font-family: "Patrick Hand", "Comic Sans MS", "Comic Sans", "Comic Neue", "Segoe Print", cursive !important;
          font-size: clamp(17px, 4.55vw, 22px) !important;
          line-height: 1.54 !important;
          font-weight: 500 !important;
          letter-spacing: 1.35px !important;
          color: var(--noteColor, #111111) !important;
          -webkit-text-fill-color: var(--noteColor, #111111) !important;
        }

        .message-text *,
        .image-description-text *,
        .file-description-text *,
        .text-input,
        .text-input * {
          font-family: "Patrick Hand", "Comic Sans MS", "Comic Sans", "Comic Neue", "Segoe Print", cursive !important;
          font-size: inherit !important;
          line-height: inherit !important;
          letter-spacing: inherit !important;
        }

        .text-input {
          font-size: clamp(17px, 4.55vw, 22px) !important;
          line-height: 1.54 !important;
          letter-spacing: 1.35px !important;
        }

        .image-description-text::before,
        .file-description-text::before {
          display: none !important;
          content: none !important;
        }


        /* =========================================================
           FINAL LAPTOP CENTER + PATRICK HAND + SELECTED COLOR FIX
           - Desktop/laptop page is centered, not stuck on the left.
           - Normal message text, image description, and file description
             use the exact same font family, size, weight, spacing.
           - Selected word/line colors are preserved in input and notes.
           - Composer tools are square with active effects and better spacing.
        ========================================================= */

        :root {
          --handNoteFont: "Patrick Hand", "Comic Sans MS", "Comic Sans", "Comic Neue", "Segoe Print", cursive;
          --handNoteSize: clamp(17px, 4.55vw, 22px);
          --handNoteLine: 1.54;
          --handNoteWeight: 500;
          --handNoteSpacing: 1.35px;
        }

        @media (min-width: 768px) {
          .nm-screen {
            display: flex !important;
            justify-content: center !important;
            align-items: stretch !important;
            padding: 0 !important;
          }

          .nm-phone {
            width: min(460px, 100vw) !important;
            max-width: 460px !important;
            min-width: 0 !important;
            flex: 0 0 min(460px, 100vw) !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }

        .message-bubble .message-text,
        .message-bubble .image-description-text,
        .message-bubble .file-description-text,
        .message-bubble .message-text *,
        .message-bubble .image-description-text *,
        .message-bubble .file-description-text *,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text,
        .message-bubble:has(.message-text):not(:has(.image-message-wrap)):not(:has(.file-message-wrap)) .message-text *,
        .message-bubble:has(.image-message-wrap) .image-description-text,
        .message-bubble:has(.image-message-wrap) .image-description-text *,
        .message-bubble:has(.file-message-wrap) .file-description-text,
        .message-bubble:has(.file-message-wrap) .file-description-text * {
          font-family: var(--handNoteFont) !important;
          font-size: var(--handNoteSize) !important;
          line-height: var(--handNoteLine) !important;
          font-weight: var(--handNoteWeight) !important;
          letter-spacing: var(--handNoteSpacing) !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          text-align: left !important;
          text-indent: 0 !important;
        }

        .message-text,
        .image-description-text,
        .file-description-text {
          color: var(--noteColor, #111111) !important;
          -webkit-text-fill-color: var(--noteColor, #111111) !important;
        }

        .message-text span[style*="color"],
        .message-text font[color],
        .image-description-text span[style*="color"],
        .image-description-text font[color],
        .file-description-text span[style*="color"],
        .file-description-text font[color],
        .text-input span[style*="color"],
        .text-input font[color] {
          -webkit-text-fill-color: currentColor !important;
        }

        .message-text span[style*="color"] *,
        .image-description-text span[style*="color"] *,
        .file-description-text span[style*="color"] *,
        .text-input span[style*="color"] * {
          color: inherit !important;
          -webkit-text-fill-color: currentColor !important;
        }

        .composer-input-row {
          align-items: center !important;
          gap: 9px !important;
        }

        .composer-input-row .text-input,
        .composer-input-row .text-input *,
        .composer-input-row .text-input div,
        .composer-input-row .text-input p,
        .composer-input-row .text-input span {
          font-family: var(--handNoteFont) !important;
          font-size: var(--handNoteSize) !important;
          line-height: var(--handNoteLine) !important;
          font-weight: var(--handNoteWeight) !important;
          letter-spacing: var(--handNoteSpacing) !important;
        }

        .composer-input-row .send-btn {
          align-self: center !important;
          transform: translateY(-2px) !important;
        }

        .composer-input-row .send-btn:active:not(:disabled) {
          transform: translateY(-1px) scale(0.94) !important;
        }

        .composer-tools-top {
          padding: 0 4px 3px !important;
          gap: 10px !important;
        }

        .tools-ball-btn {
          transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease !important;
        }

        .tools-ball-btn.active,
        .tools-ball-btn:active {
          transform: scale(1.08) !important;
          filter: brightness(1.04) !important;
          box-shadow: 0 10px 24px rgba(249, 115, 22, 0.28) !important;
        }

        .composer-tools-popover {
          gap: 8px !important;
          padding: 5px 7px !important;
          border-radius: 15px !important;
          background: rgba(255, 255, 255, 0.98) !important;
          border: 1px solid rgba(203, 213, 225, 0.95) !important;
          box-shadow: 0 11px 28px rgba(15, 23, 42, 0.15) !important;
        }

        .composer-tools-popover .tool-btn {
          width: 32px !important;
          height: 32px !important;
          min-width: 32px !important;
          min-height: 32px !important;
          border-radius: 10px !important;
          border: 1px solid #dbe4f0 !important;
          background: linear-gradient(145deg, #ffffff, #f8fafc) !important;
          color: #334155 !important;
          box-shadow: 0 5px 13px rgba(15, 23, 42, 0.07) !important;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease !important;
        }

        .composer-tools-popover .tool-btn:hover,
        .composer-tools-popover .tool-btn:focus-visible,
        .composer-tools-popover .tool-btn.active {
          transform: translateY(-1px) !important;
          border-color: #38bdf8 !important;
          background: linear-gradient(145deg, #ecfeff, #eff6ff) !important;
          box-shadow: 0 8px 18px rgba(14, 165, 233, 0.17) !important;
          outline: 2px solid rgba(14, 165, 233, 0.12) !important;
          outline-offset: 1px !important;
        }

        .composer-tools-popover .tool-btn:active {
          transform: scale(0.94) !important;
        }

        .composer-tools-popover .tool-btn.active::before {
          content: "" !important;
          position: absolute !important;
          top: 4px !important;
          right: 4px !important;
          width: 6px !important;
          height: 6px !important;
          border-radius: 999px !important;
          background: #0ea5e9 !important;
          box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.14) !important;
        }

        .header-brand-row {
          transform-origin: center center !important;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease !important;
        }

        .header-brand-row:active {
          transform: scale(0.985) !important;
          filter: brightness(1.02) !important;
        }

        .header-brand-row.brand-pop {
          animation: fullHeaderBoxPop 0.46s cubic-bezier(.2,.9,.2,1) both !important;
        }

        @keyframes fullHeaderBoxPop {
          0% { transform: scale(1); box-shadow: 0 10px 24px rgba(185, 28, 28, 0.12), 0 2px 0 rgba(255,255,255,0.95) inset; }
          32% { transform: scale(1.035) translateY(-1px); box-shadow: 0 15px 34px rgba(220, 38, 38, 0.22), 0 0 0 5px rgba(248, 113, 113, 0.13); }
          70% { transform: scale(0.992); }
          100% { transform: scale(1); }
        }

        @media (min-width: 768px) {
          :root {
            --handNoteSize: 22px;
          }
        }

        @media (max-width: 480px) {
          .composer-tools-popover {
            gap: 7px !important;
          }

          .composer-tools-popover .tool-btn {
            width: 31px !important;
            height: 31px !important;
            min-width: 31px !important;
            min-height: 31px !important;
          }
        }

        /* Chat images are fetched only after the user chooses to view them. */
        .image-view-card {
          width: min(82vw, 334px) !important;
          height: 190px !important;
          border: 1px solid #dbe4f0 !important;
          border-radius: 18px !important;
          background: linear-gradient(145deg, #f8fafc, #eef6ff) !important;
          color: #2563eb !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          font: 800 13px/1.2 "Poppins", "Inter", sans-serif !important;
          cursor: pointer !important;
        }

        .image-view-card:hover,
        .image-view-card:focus-visible {
          background: #eff6ff !important;
          border-color: #93c5fd !important;
          outline: none !important;
        }

        .inline-image-preloader {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        .image-card-spinner {
          border-color: rgba(37, 99, 235, 0.25) !important;
          border-top-color: #2563eb !important;
        }

        .image-viewer-loading,
        .image-viewer-error {
          position: absolute !important;
          inset: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 16px !important;
          background: rgba(15, 23, 42, 0.72) !important;
          color: #fff !important;
          font: 700 13px/1.2 "Poppins", "Inter", sans-serif !important;
        }

        .image-spinner {
          width: 28px !important;
          height: 28px !important;
          border: 3px solid rgba(255, 255, 255, 0.35) !important;
          border-top-color: #fff !important;
          border-radius: 50% !important;
          animation: imageViewerSpin 0.72s linear infinite !important;
        }

        .sending-message-indicator {
          position: fixed !important;
          left: 50% !important;
          top: 50% !important;
          z-index: 10001 !important;
          transform: translate(-50%, -50%) !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          padding: 10px 15px !important;
          border-radius: 999px !important;
          background: #16a34a !important;
          color: #fff !important;
          box-shadow: 0 12px 28px rgba(22, 163, 74, 0.28) !important;
          font: 800 12px/1 "Poppins", "Inter", sans-serif !important;
          pointer-events: none !important;
        }

        .sending-message-dot {
          width: 7px !important;
          height: 7px !important;
          border-radius: 50% !important;
          background: #dcfce7 !important;
          animation: sendingMessagePulse 0.9s ease-in-out infinite !important;
        }

        @keyframes imageViewerSpin { to { transform: rotate(360deg); } }
        @keyframes sendingMessagePulse { 50% { transform: scale(0.55); opacity: 0.55; } }



        /* =========================================================
           FINAL MODERN GLASS UI
           - Channel logo: perfect 360° circle
           - Full logo visible: contain, never crop/zoom
           - Fresh modern cyan / indigo / violet palette
           - Glass look for all interactive buttons
           - Preserve all existing page functionality
        ========================================================= */

        :root {
          --glass-white: rgba(255,255,255,0.18);
          --glass-white-strong: rgba(255,255,255,0.28);
          --glass-border: rgba(255,255,255,0.34);
          --modern-cyan: #06b6d4;
          --modern-blue: #3b82f6;
          --modern-indigo: #6366f1;
          --modern-violet: #8b5cf6;
          --modern-pink: #ec4899;
          --modern-slate: #0f172a;
        }

        .nm-screen {
          background:
            radial-gradient(circle at 8% 8%, rgba(6,182,212,0.28), transparent 28%),
            radial-gradient(circle at 92% 18%, rgba(99,102,241,0.28), transparent 30%),
            radial-gradient(circle at 50% 100%, rgba(139,92,246,0.24), transparent 36%),
            linear-gradient(145deg, #020617 0%, #0b1225 48%, #111827 100%) !important;
        }

        .nm-phone {
          background:
            linear-gradient(145deg, #f7fbff 0%, #eef7ff 48%, #f5f3ff 100%) !important;
        }

        .nm-header {
          background:
            radial-gradient(circle at 12% 0%, rgba(255,255,255,0.30), transparent 28%),
            radial-gradient(circle at 92% 100%, rgba(139,92,246,0.28), transparent 32%),
            linear-gradient(135deg, #0891b2 0%, #2563eb 48%, #6366f1 100%) !important;
          border-bottom: 1px solid rgba(255,255,255,0.24) !important;
          box-shadow:
            0 12px 35px rgba(37,99,235,0.22),
            inset 0 1px 0 rgba(255,255,255,0.22) !important;
        }

        /* Perfect circular channel logo. */
        .header-brand-row .header-logo,
        .header-logo {
          width: 50px !important;
          height: 50px !important;
          min-width: 50px !important;
          max-width: 50px !important;
          flex: 0 0 50px !important;
          border-radius: 50% !important;
          overflow: hidden !important;
          padding: 2px !important;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.98), rgba(224,242,254,0.96)) !important;
          border: 2px solid rgba(255,255,255,0.82) !important;
          box-shadow:
            0 0 0 2px rgba(255,255,255,0.12),
            0 10px 24px rgba(15,23,42,0.24),
            inset 0 1px 1px rgba(255,255,255,0.95) !important;
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* Never crop or zoom the channel logo. */
        .header-brand-row .header-logo img,
        .header-logo img {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          object-fit: contain !important;
          object-position: center !important;
          border-radius: 50% !important;
          display: block !important;
          background: transparent !important;
        }

        .header-brand-row {
          background: rgba(255,255,255,0.16) !important;
          border: 1px solid rgba(255,255,255,0.30) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.24),
            0 10px 28px rgba(15,23,42,0.16) !important;
          backdrop-filter: blur(18px) saturate(145%) !important;
          -webkit-backdrop-filter: blur(18px) saturate(145%) !important;
        }

        /* Universal glass treatment for buttons. */
        button {
          -webkit-backdrop-filter: blur(14px) saturate(145%) !important;
          backdrop-filter: blur(14px) saturate(145%) !important;
          transition:
            transform 0.16s ease,
            background 0.16s ease,
            border-color 0.16s ease,
            box-shadow 0.16s ease,
            filter 0.16s ease !important;
        }

        button:hover:not(:disabled) {
          filter: brightness(1.04) saturate(1.06) !important;
          transform: translateY(-1px) !important;
        }

        button:active:not(:disabled) {
          transform: translateY(0) scale(0.97) !important;
        }

        .header-icon-btn,
        .back-btn,
        .search-btn,
        .unlock-back-btn,
        .unlock-open-btn {
          background: rgba(255,255,255,0.16) !important;
          border: 1px solid rgba(255,255,255,0.34) !important;
          color: #ffffff !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.22),
            0 8px 20px rgba(15,23,42,0.14) !important;
        }

        .header-icon-btn:hover:not(:disabled),
        .search-btn.active {
          background: rgba(255,255,255,0.28) !important;
          border-color: rgba(255,255,255,0.52) !important;
        }

        .tool-btn,
        .square-action,
        .format-btn,
        .color-tool,
        .image-tool,
        .file-tool,
        .text-square,
        .title-square,
        .update-square,
        .download-square,
        .view-full-square,
        .pin-square,
        .delete-square,
        .pinned-note-jump,
        .message-dot-btn,
        .search-box button,
        .cancel-confirm,
        .delete-confirm {
          background: rgba(255,255,255,0.52) !important;
          border: 1px solid rgba(148,163,184,0.30) !important;
          color: #1e293b !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.78),
            0 7px 18px rgba(15,23,42,0.08) !important;
        }

        .tool-btn:hover:not(:disabled),
        .square-action:hover:not(:disabled),
        .format-btn:hover:not(:disabled),
        .search-box button:hover:not(:disabled) {
          background: rgba(255,255,255,0.78) !important;
          border-color: rgba(99,102,241,0.30) !important;
        }

        .send-btn {
          background:
            linear-gradient(135deg, rgba(6,182,212,0.88), rgba(37,99,235,0.88), rgba(139,92,246,0.88)) !important;
          border: 1px solid rgba(255,255,255,0.36) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.28),
            0 10px 24px rgba(37,99,235,0.26) !important;
        }

        .delete-square,
        .delete-confirm {
          background: rgba(239,68,68,0.16) !important;
          border-color: rgba(239,68,68,0.28) !important;
          color: #b91c1c !important;
        }

        .composer {
          background: rgba(248,250,252,0.72) !important;
          border-top: 1px solid rgba(148,163,184,0.22) !important;
          box-shadow: 0 -12px 30px rgba(15,23,42,0.08) !important;
          backdrop-filter: blur(20px) saturate(135%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(135%) !important;
        }

        .composer-card {
          background: rgba(255,255,255,0.48) !important;
          border: 1px solid rgba(148,163,184,0.25) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.78),
            0 10px 28px rgba(15,23,42,0.07) !important;
          backdrop-filter: blur(18px) saturate(140%) !important;
          -webkit-backdrop-filter: blur(18px) saturate(140%) !important;
        }

        .text-input {
          background: rgba(255,255,255,0.64) !important;
          border-color: rgba(99,102,241,0.20) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.84),
            0 4px 14px rgba(15,23,42,0.04) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
        }

        .text-input:focus {
          border-color: rgba(37,99,235,0.48) !important;
          box-shadow:
            0 0 0 3px rgba(59,130,246,0.12),
            inset 0 1px 0 rgba(255,255,255,0.90) !important;
        }

        .chat-body {
          background:
            radial-gradient(circle at 5% 4%, rgba(6,182,212,0.12), transparent 27%),
            radial-gradient(circle at 95% 12%, rgba(99,102,241,0.13), transparent 30%),
            radial-gradient(circle at 55% 100%, rgba(139,92,246,0.10), transparent 32%),
            linear-gradient(135deg, #f4fbff 0%, #f8fbff 48%, #f7f5ff 100%) !important;
        }

        .message-bubble,
        .empty-card,
        .search-box,
        .confirm-card {
          background: rgba(255,255,255,0.62) !important;
          border-color: rgba(148,163,184,0.20) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.80),
            0 10px 28px rgba(15,23,42,0.075) !important;
          backdrop-filter: blur(16px) saturate(135%) !important;
          -webkit-backdrop-filter: blur(16px) saturate(135%) !important;
        }

        .date-separator span {
          background:
            linear-gradient(135deg, rgba(6,182,212,0.90), rgba(99,102,241,0.90), rgba(139,92,246,0.90)) !important;
          border: 1px solid rgba(255,255,255,0.30) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.25),
            0 9px 22px rgba(99,102,241,0.18) !important;
        }

        .toast {
          background: rgba(255,255,255,0.72) !important;
          border: 1px solid rgba(255,255,255,0.52) !important;
          backdrop-filter: blur(22px) saturate(145%) !important;
          -webkit-backdrop-filter: blur(22px) saturate(145%) !important;
        }

        @media (max-width: 480px) {
          .header-brand-row .header-logo,
          .header-logo {
            width: 48px !important;
            height: 48px !important;
            min-width: 48px !important;
            max-width: 48px !important;
            flex-basis: 48px !important;
          }
        }


        /* =========================================================
           FINAL USER REQUEST FIX
           - Stable different date badge colors
           - Delete disappears immediately; successful delete = tiny red toast
           - Heading button after file icon
           - Heading mode bolds only the first entered line
           - Glass buttons with distinct colors
        ========================================================= */

        .date-separator > span {
          background: linear-gradient(135deg, var(--badge1), var(--badge2)) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,0.48) !important;
          box-shadow:
            0 7px 18px color-mix(in srgb, var(--badge1) 28%, transparent) !important,
            inset 0 1px 0 rgba(255,255,255,0.32) !important;
        }

        .composer-tools-popover .tool-btn {
          backdrop-filter: blur(14px) saturate(145%) !important;
          -webkit-backdrop-filter: blur(14px) saturate(145%) !important;
          border: 1px solid rgba(255,255,255,0.62) !important;
          box-shadow:
            0 5px 13px rgba(15,23,42,0.10),
            inset 0 1px 0 rgba(255,255,255,0.72) !important;
          transition: transform .16s ease, box-shadow .16s ease, background .16s ease !important;
        }

        .composer-tools-popover .format-btn:nth-child(1) {
          background: rgba(59,130,246,.14) !important;
          color: #1d4ed8 !important;
          border-color: rgba(96,165,250,.45) !important;
        }

        .composer-tools-popover .format-btn:nth-child(2) {
          background: rgba(124,58,237,.14) !important;
          color: #6d28d9 !important;
          border-color: rgba(167,139,250,.48) !important;
        }

        .composer-tools-popover .color-tool {
          background: rgba(245,158,11,.16) !important;
          color: #b45309 !important;
          border-color: rgba(251,191,36,.48) !important;
        }

        .composer-tools-popover .image-tool {
          background: rgba(16,185,129,.15) !important;
          color: #047857 !important;
          border-color: rgba(52,211,153,.48) !important;
        }

        .composer-tools-popover .file-tool {
          background: rgba(236,72,153,.14) !important;
          color: #be185d !important;
          border-color: rgba(244,114,182,.48) !important;
        }

        .composer-tools-popover .heading-tool {
          background: rgba(14,165,233,.15) !important;
          color: #0369a1 !important;
          border-color: rgba(56,189,248,.52) !important;
        }

        .composer-tools-popover .tool-btn:hover,
        .composer-tools-popover .tool-btn:active,
        .composer-tools-popover .tool-btn.active {
          transform: translateY(-1px) scale(1.04) !important;
          box-shadow:
            0 8px 17px rgba(15,23,42,.14),
            inset 0 1px 0 rgba(255,255,255,.82) !important;
        }

        .heading-tool-icon {
          font-size: 9px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          letter-spacing: -.2px !important;
        }

        .message-title-text {
          font-weight: 500 !important;
          color: var(--noteColor, #111111) !important;
          font-family: "Times New Roman", Times, serif !important;
        }

        .message-title-text .note-heading-line {
          display: block !important;
          font-weight: 900 !important;
          color: inherit !important;
          margin: 0 0 4px !important;
        }

        .message-title-text .note-heading-line * {
          font-weight: 900 !important;
        }

        .message-title-text .note-heading-line + * {
          font-weight: 500 !important;
        }

        .message-title-text::before {
          content: "HEADING" !important;
          font-family: "Poppins", "Inter", sans-serif !important;
          color: #0369a1 !important;
          background: #e0f2fe !important;
        }

        .toast.deleted {
          width: auto !important;
          min-width: 0 !important;
          max-width: 100px !important;
          padding: 5px 9px !important;
          border-radius: 999px !important;
          background: rgba(254,226,226,.94) !important;
          border: 1px solid rgba(248,113,113,.55) !important;
          color: #dc2626 !important;
          box-shadow: 0 5px 15px rgba(220,38,38,.12) !important;
          font-family: "Poppins", "Inter", sans-serif !important;
          font-size: 9px !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: .25px !important;
          text-transform: lowercase !important;
        }

        .toast.deleted .toast-icon {
          display: none !important;
        }

        .toast.deleted p {
          color: #dc2626 !important;
          margin: 0 !important;
          font-size: 9px !important;
          font-weight: 900 !important;
        }

        @media (max-width: 480px) {
          .composer-tools-popover {
            gap: 5px !important;
            padding: 3px 5px !important;
          }

          .composer-tools-popover .tool-btn {
            width: 29px !important;
            height: 29px !important;
            min-width: 29px !important;
            min-height: 29px !important;
          }
        }


        /* =========================================================
           FINAL HARD FIX — visible heading / per-date colors / fast UI
        ========================================================= */
        .composer-tools-popover {
          display: flex !important;
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
          width: max-content !important;
          max-width: 100% !important;
        }

        .composer-tools-popover::-webkit-scrollbar {
          display: none !important;
        }

        .composer-tools-popover .heading-tool {
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          flex: 0 0 34px !important;
          width: 34px !important;
          min-width: 34px !important;
          height: 31px !important;
          min-height: 31px !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: visible !important;
          position: relative !important;
          z-index: 20 !important;
          background: linear-gradient(135deg, rgba(14,165,233,.22), rgba(59,130,246,.18)) !important;
          color: #0369a1 !important;
          border: 1px solid rgba(14,165,233,.55) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.82),
            0 6px 15px rgba(14,165,233,.18) !important;
        }

        .composer-tools-popover .heading-tool-icon {
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          color: #0369a1 !important;
          font-size: 12px !important;
          line-height: 1 !important;
          font-weight: 950 !important;
          letter-spacing: -.3px !important;
        }

        /* Refresh belongs in the composer toolbar, immediately after H+. */
        .composer-tools-popover .composer-refresh-tool {
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          flex: 0 0 34px !important;
          width: 34px !important;
          min-width: 34px !important;
          height: 31px !important;
          min-height: 31px !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 9px !important;
          background: linear-gradient(135deg, rgba(16,185,129,.18), rgba(14,165,233,.18)) !important;
          color: #047857 !important;
          border: 1px solid rgba(16,185,129,.52) !important;
          font-size: 16px !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          padding: 0 !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.82),
            0 6px 15px rgba(16,185,129,.15) !important;
        }

        .composer-tools-popover .composer-refresh-tool:hover:not(:disabled),
        .composer-tools-popover .composer-refresh-tool:focus-visible {
          transform: translateY(-1px) scale(1.04) !important;
          background: linear-gradient(135deg, rgba(16,185,129,.28), rgba(14,165,233,.25)) !important;
          outline: none !important;
        }

        .composer-tools-popover .composer-refresh-tool:disabled {
          opacity: .72 !important;
          cursor: default !important;
        }

        .composer-tools-popover .composer-refresh-tool.is-refreshing {
          animation: noteRefreshSpin 0.75s linear infinite !important;
        }

        .date-separator > span {
          background: linear-gradient(135deg, var(--badge1), var(--badge2)) !important;
          background-image: linear-gradient(135deg, var(--badge1), var(--badge2)) !important;
        }

        /* Delete-success toast: tiny red "deleted" only. */
        .toast.deleted {
          width: fit-content !important;
          min-width: 0 !important;
          max-width: 90px !important;
          padding: 5px 9px !important;
          background: rgba(254,226,226,.96) !important;
          border: 1px solid rgba(248,113,113,.65) !important;
          color: #dc2626 !important;
          border-radius: 999px !important;
        }

        .toast.deleted .toast-icon {
          display: none !important;
        }

        .toast.deleted p {
          margin: 0 !important;
          color: #dc2626 !important;
          font-size: 9px !important;
          font-weight: 900 !important;
          text-transform: lowercase !important;
        }


        /* =========================================================
           FINAL SAFE REFRESH + COPY UPDATE
           API-only refresh; preserves scroll and composer state.
        ========================================================= */

        .refresh-btn {
          width: 28px !important;
          height: 28px !important;
          min-width: 28px !important;
          min-height: 28px !important;
          border-radius: 8px !important;
          background: rgba(255,255,255,0.16) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,0.22) !important;
          font-size: 17px !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          box-shadow: none !important;
          flex: 0 0 auto !important;
        }

        .refresh-btn:hover:not(:disabled),
        .refresh-btn:focus-visible {
          background: rgba(255,255,255,0.25) !important;
          outline: none !important;
        }

        .refresh-btn:disabled {
          opacity: 0.75 !important;
          cursor: default !important;
        }

        .refresh-btn.is-refreshing {
          animation: noteRefreshSpin 0.75s linear infinite !important;
        }

        @keyframes noteRefreshSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .copy-square {
          background: #e0f2fe !important;
          color: #0369a1 !important;
        }

        .copy-square:hover {
          background: #bae6fd !important;
          color: #075985 !important;
        }

        @media (max-width: 480px) {
          .refresh-btn {
            width: 25px !important;
            height: 25px !important;
            min-width: 25px !important;
            min-height: 25px !important;
            border-radius: 7px !important;
            font-size: 15px !important;
          }
        }

        @media (max-width: 360px) {
          .refresh-btn {
            width: 23px !important;
            height: 23px !important;
            min-width: 23px !important;
            min-height: 23px !important;
            font-size: 14px !important;
          }
        }


        /* USER REQUEST: final toolbar, refresh, multi-pin and rich-copy behavior */
        .pinned-note-jump-list {
          display: flex !important; flex-direction: column !important; gap: 5px !important;
          width: 100% !important; flex: 0 0 auto !important;
        }
        .pinned-note-jump { cursor: pointer !important; text-align: left !important; }
        .pinned-note-jump strong { min-width: 0 !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
        .pinned-note-block .message-bubble { box-shadow: 0 0 0 2px rgba(245,158,11,.38), 0 12px 30px rgba(245,158,11,.16) !important; }
        .pinned-message-chip {
          position: absolute !important; top: 7px !important; left: 7px !important; z-index: 9 !important;
          width: 22px !important; height: 22px !important; border-radius: 50% !important;
          display: inline-flex !important; align-items: center !important; justify-content: center !important;
          background: #fff7ed !important; border: 1px solid #fdba74 !important;
          box-shadow: 0 4px 12px rgba(245,158,11,.22) !important; font-size: 11px !important;
        }
        .composer-tools-popover .tool-btn {
          width: 42px !important; min-width: 42px !important; height: 38px !important; min-height: 38px !important;
          border-radius: 12px !important; font-size: 16px !important;
          transition: transform .16s ease, box-shadow .16s ease, background .16s ease !important;
        }
        .composer-tools-popover .tool-btn.active {
          background: linear-gradient(135deg,#7c3aed,#ec4899) !important;
          color: #fff !important; border-color: transparent !important;
          box-shadow: 0 7px 18px rgba(124,58,237,.34), 0 0 0 2px rgba(236,72,153,.12) !important;
          transform: translateY(-1px) scale(1.04) !important;
        }
        .composer-tools-popover .color-tool.active {
          background: linear-gradient(135deg,var(--pickedColor),#111827) !important;
        }
        .composer-tools-popover .heading-tool.active {
          background: linear-gradient(135deg,#f97316,#ef4444) !important; color:#fff !important;
        }
        .composer-tools-popover .composer-refresh-tool { width:42px !important; min-width:42px !important; height:38px !important; }
        .professional-refresh-overlay {
          position: absolute !important; inset: 0 !important; z-index: 24 !important;
          display:flex !important; align-items:center !important; justify-content:center !important;
          pointer-events:none !important; background: rgba(238,247,244,.24) !important; backdrop-filter: blur(2px) !important;
        }
        .professional-refresh-card {
          display:flex !important; align-items:center !important; gap:9px !important; padding:9px 14px !important;
          border-radius:999px !important; background:rgba(255,255,255,.94) !important;
          border:1px solid #dbe4f0 !important; color:#0f766e !important; font:900 12px Inter,Arial,sans-serif !important;
          box-shadow:0 10px 28px rgba(15,23,42,.16) !important;
        }
        .professional-refresh-spinner {
          width:16px !important; height:16px !important; border:2px solid #cbd5e1 !important;
          border-top-color:#0ea5e9 !important; border-right-color:#14b8a6 !important; border-radius:50% !important;
          animation: noteRefreshSpin .7s linear infinite !important;
        }
        .chat-body { position: relative !important; }
        @media (max-width:480px) {
          .composer-tools-popover .tool-btn { width:40px !important; min-width:40px !important; height:38px !important; }
        }


        /* FINAL USER LOGIC OVERRIDES */
        .pin-section {
          position: relative !important;
          width: 100% !important;
          display: flex !important;
          justify-content: flex-start !important;
          align-items: center !important;
          padding: 4px 10px 2px !important;
          background: rgba(255,255,255,.94) !important;
          border-bottom: 1px solid rgba(226,232,240,.82) !important;
          z-index: 26 !important;
        }

        .pin-section-trigger {
          position: relative !important;
          width: 30px !important;
          height: 30px !important;
          min-width: 30px !important;
          min-height: 30px !important;
          padding: 0 !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 50% !important;
          background: #f8fafc !important;
          color: #64748b !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          box-shadow: 0 4px 12px rgba(15,23,42,.10) !important;
          transition: .16s ease !important;
        }

        .pin-section-trigger.active,
        .pin-section-trigger:hover {
          background: linear-gradient(135deg,#7c3aed,#ec4899) !important;
          border-color: transparent !important;
          color: white !important;
          transform: scale(1.04) !important;
          box-shadow: 0 7px 17px rgba(124,58,237,.25) !important;
        }

        .pin-section-round-icon {
          font-size: 11px !important;
          line-height: 1 !important;
          display: block !important;
          transform: rotate(-8deg) !important;
        }

        .pin-section-count {
          position: absolute !important;
          right: -4px !important;
          top: -4px !important;
          min-width: 13px !important;
          height: 13px !important;
          padding: 0 3px !important;
          border-radius: 999px !important;
          background: #ef4444 !important;
          color: white !important;
          border: 2px solid white !important;
          font: 900 7px/9px Inter,Arial,sans-serif !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .pinned-note-jump-list {
          position: absolute !important;
          top: 35px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: min(360px, calc(100% - 18px)) !important;
          max-height: 250px !important;
          overflow-y: auto !important;
          padding: 6px !important;
          border: 1px solid #dbe4f0 !important;
          border-radius: 15px !important;
          background: rgba(255,255,255,.98) !important;
          box-shadow: 0 18px 42px rgba(15,23,42,.18) !important;
          z-index: 60 !important;
        }

        .pinned-note-jump {
          width: 100% !important;
          min-height: 34px !important;
          margin: 2px 0 !important;
          padding: 5px 7px !important;
          border-radius: 10px !important;
          display: grid !important;
          grid-template-columns: 22px 38px minmax(0,1fr) !important;
          gap: 6px !important;
          align-items: center !important;
          border: 1px solid transparent !important;
          background: #f8fafc !important;
        }

        .pinned-note-icon {
          width: 21px !important;
          height: 21px !important;
          border-radius: 50% !important;
          font-size: 10px !important;
        }

        .pinned-note-label {
          font-size: 9px !important;
        }

        .pinned-note-jump strong {
          font-size: 11px !important;
        }

        .message-title-badge {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 15px !important;
          min-width: 32px !important;
          padding: 0 5px !important;
          margin: 0 5px 3px 0 !important;
          border-radius: 999px !important;
          background: linear-gradient(135deg,#f97316,#ef4444) !important;
          color: white !important;
          font: 900 7px/1 Inter,Arial,sans-serif !important;
          letter-spacing: .35px !important;
          vertical-align: middle !important;
          box-shadow: 0 3px 8px rgba(239,68,68,.18) !important;
        }

        .message-title-text::before {
          content: none !important;
          display: none !important;
        }

        .message-title-text {
          font-weight: 500 !important;
          font-family: Inter, Arial, sans-serif !important;
        }

        .message-title-text .note-heading-line {
          display: inline !important;
          font-weight: 900 !important;
          margin: 0 !important;
        }

        .message-title-text .note-heading-line * {
          font-weight: inherit !important;
        }

        .message-title-text .note-heading-line + * {
          font-weight: inherit !important;
        }

        .message-title-text,
        .message-title-text * {
          font-size: inherit !important;
          line-height: inherit !important;
        }

        .pinned-message-chip {
          width: 17px !important;
          height: 17px !important;
          min-width: 17px !important;
          min-height: 17px !important;
          bottom: 5px !important;
          left: 5px !important;
          top: auto !important;
          border-radius: 50% !important;
          font-size: 8px !important;
          padding: 0 !important;
          z-index: 8 !important;
          box-shadow: 0 3px 8px rgba(15,23,42,.12) !important;
        }

        .pinned-message-bubble {
          outline: none !important;
          box-shadow: 0 0 0 1px rgba(20,184,166,.22), 0 8px 22px rgba(15,23,42,.10) !important;
        }

        .composer-tools-popover .tool-btn {
          width: 44px !important;
          min-width: 44px !important;
          height: 40px !important;
          min-height: 40px !important;
          border-radius: 13px !important;
        }

        .composer-tools-popover .tool-btn.active {
          background: linear-gradient(135deg,#7c3aed,#ec4899) !important;
          color: #fff !important;
          border-color: transparent !important;
          box-shadow: 0 7px 18px rgba(124,58,237,.30) !important;
        }

        .composer-tools-popover .color-tool.active {
          background: linear-gradient(135deg,var(--pickedColor),#111827) !important;
        }

        .composer-tools-popover .heading-tool.active {
          background: linear-gradient(135deg,#f97316,#ef4444) !important;
        }

        .composer-tools-popover .image-tool.active,
        .composer-tools-popover .file-tool.active {
          background: linear-gradient(135deg,#0891b2,#2563eb) !important;
          border-color: transparent !important;
          box-shadow: 0 7px 18px rgba(37,99,235,.25) !important;
        }

        .composer-refresh-tool.is-refreshing {
          animation: noteRefreshSpin .55s linear infinite !important;
        }

        .professional-refresh-overlay {
          pointer-events: none !important;
        }

        @media (max-width:480px) {
          .composer-tools-popover .tool-btn {
            width: 40px !important;
            min-width: 40px !important;
            height: 38px !important;
          }
        }
        /* FINAL UX FIXES: stable typing, left pin, immediate editor focus */
        .pin-section { justify-content: flex-start !important; padding-left: 10px !important; }
        .pin-section-trigger { width: 28px !important; height: 28px !important; min-width: 28px !important; min-height: 28px !important; }
        .pin-section-round-icon { font-size: 10px !important; }
        .pin-section-count { right: -3px !important; top: -3px !important; }
        .search-box { position: relative !important; z-index: 70 !important; }
        .pinned-message-chip { top: 5px !important; left: 5px !important; bottom: auto !important; width: 17px !important; height: 17px !important; font-size: 8px !important; }
        .message-bubble { overflow: visible !important; }
        .message-title-badge { flex-shrink: 0 !important; }
        .text-input { border: 1px solid rgba(148,163,184,.55) !important; box-shadow: 0 8px 24px rgba(15,23,42,.08), inset 0 1px 0 rgba(255,255,255,.7) !important; }
        .send-btn { backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; background: rgba(255,255,255,.42) !important; border: 1px solid rgba(255,255,255,.72) !important; box-shadow: 0 8px 20px rgba(15,23,42,.12) !important; transition: transform .12s ease, box-shadow .12s ease !important; }
        .send-btn:active { transform: scale(.92) !important; box-shadow: 0 4px 10px rgba(15,23,42,.16) !important; }
        .composer-tools-popover .tool-btn.active { background: linear-gradient(135deg,#7c3aed,#ec4899) !important; color:#fff !important; }


        .trust-device-row {
          width: 100%;
          min-height: 40px;
          margin: 4px 0 3px;
          padding: 8px 11px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dbe4f0;
          border-radius: 13px;
          background: linear-gradient(135deg, #f8fafc, #eef6ff);
          color: #334155;
          text-align: left;
          cursor: pointer;
          user-select: none;
        }
        .trust-device-row input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }
        .trust-device-checkmark {
          width: 19px;
          height: 19px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1.5px solid #94a3b8;
          background: white;
          color: transparent;
          font-size: 12px;
          font-weight: 950;
          transition: all .16s ease;
        }
        .trust-device-row:has(input:checked) .trust-device-checkmark {
          border-color: #2563eb;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: white;
          box-shadow: 0 5px 14px rgba(37,99,235,.22);
        }
        .trust-device-label {
          font-size: 12px;
          font-weight: 900;
          color: #0f172a;
        }
        .trust-device-hint {
          margin: 4px 2px 10px !important;
          color: #64748b !important;
          font-size: 10.5px !important;
          line-height: 1.35 !important;
          font-weight: 700 !important;
        }
        .message-link-badge {
          position: absolute;
          top: 7px;
          left: 7px;
          z-index: 8;
          min-width: 34px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #dbeafe;
          border: 1px solid #93c5fd;
          color: #1d4ed8;
          font-size: 8px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: .35px;
          box-shadow: 0 4px 12px rgba(37,99,235,.12);
        }
        .message-link-badge + .pinned-message-chip {
          left: 46px;
        }

        /* FINAL LINK ACTION FIX */
        .message-action-row .link-square {
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: relative !important;
          z-index: 50 !important;
          color: #1d4ed8 !important;
          background: #eff6ff !important;
          border: 1px solid #93c5fd !important;
        }
        .message-action-row .link-square:hover,
        .message-action-row .link-square:focus-visible {
          background: #dbeafe !important;
          color: #1e3a8a !important;
          outline: none !important;
        }

        /* Final exact inline-format rendering: preserve per-word color/bold/underline. */
        .message-text span[style*="color"],
        .message-text font[color],
        .image-description-text span[style*="color"],
        .image-description-text font[color],
        .file-description-text span[style*="color"],
        .file-description-text font[color],
        .text-input span[style*="color"],
        .text-input font[color] {
          -webkit-text-fill-color: currentColor !important;
        }
        .message-text span[style*="font-weight"],
        .message-text b,
        .message-text strong,
        .image-description-text span[style*="font-weight"],
        .image-description-text b,
        .image-description-text strong,
        .file-description-text span[style*="font-weight"],
        .file-description-text b,
        .file-description-text strong,
        .text-input span[style*="font-weight"],
        .text-input b,
        .text-input strong {
          font-weight: 900 !important;
        }
        .message-text span[style*="text-decoration"],
        .message-text u,
        .image-description-text span[style*="text-decoration"],
        .image-description-text u,
        .file-description-text span[style*="text-decoration"],
        .file-description-text u,
        .text-input span[style*="text-decoration"],
        .text-input u {
          text-decoration: underline !important;
          text-underline-offset: 3px;
        }
        .message-title-text {
          font-weight: 400 !important;
        }
        .message-title-text .note-heading-line,
        .message-title-text .note-heading-line * {
          font-weight: 900 !important;
        }
        .message-title-text > div:not(:first-child),
        .message-title-text > p:not(:first-child) {
          font-weight: 400 !important;
        }


        /* FINAL FORMAT + TITLE OVERRIDES */
        .composer-input-row .text-input,
        .composer-input-row .text-input div,
        .composer-input-row .text-input p,
        .composer-input-row .text-input span {
          font-weight: 400 !important;
        }
        .composer-input-row .text-input strong,
        .composer-input-row .text-input b {
          font-weight: 900 !important;
        }
        .composer-input-row .text-input u {
          text-decoration: underline !important;
          text-underline-offset: 3px;
        }
        .composer-input-row .text-input strong u,
        .composer-input-row .text-input u strong {
          font-weight: 900 !important;
          text-decoration: underline !important;
        }
        .message-title-text {
          font-weight: 400 !important;
        }
        .message-title-text .note-heading-line {
          display: inline !important;
          font-weight: 900 !important;
        }
        .message-title-text .note-heading-line * {
          font-weight: 900 !important;
        }
        .message-title-text div,
        .message-title-text p {
          font-weight: 400 !important;
        }
        .message-title-text div:first-child,
        .message-title-text p:first-child {
          font-weight: 400 !important;
        }
        @media (max-height: 700px) and (max-width: 700px) {
          .channel-header, .chat-header { padding-top: 6px !important; padding-bottom: 6px !important; }
          .header-logo img, .header-logo { width: 38px !important; height: 38px !important; }
          .header-title h2 { font-size: 14px !important; }
          .header-title p { font-size: 9px !important; }
          .composer-tools-top { gap: 4px !important; padding: 4px !important; }
          .composer-tools-popover .tool-btn, .tool-btn { width: 34px !important; height: 34px !important; min-width: 34px !important; }
          .composer-input-row { gap: 5px !important; }
          .composer-input-row .text-input { min-height: 38px !important; max-height: 82px !important; padding: 8px 10px !important; }
          .send-btn { width: 40px !important; height: 40px !important; }
        }

        .multi-image-preview-grid { display:flex; gap:6px; align-items:center; overflow-x:auto; }
        .multi-image-preview-grid img { width:42px; height:42px; object-fit:cover; border-radius:8px; border:1px solid rgba(148,163,184,.45); }

        .message-image-grid {
          display:flex !important;
          flex-direction:column !important;
          flex-wrap:nowrap !important;
          align-items:stretch !important;
          gap:8px;
          width:min(300px,72vw);
        }
        .message-image-item {
          position:relative;
          width:100%;
          min-width:0;
          flex:0 0 auto;
        }
        .message-image-grid .message-image { display:block; width:100%; max-width:none; max-height:220px; object-fit:cover; border-radius:10px; cursor:pointer; }
        .message-image-dot-btn { position:absolute; top:7px; right:7px; width:26px; height:26px; border:0; border-radius:50%; display:grid; place-items:center; background:rgba(15,23,42,.72); color:#fff; font-size:17px; line-height:1; cursor:pointer; z-index:3; box-shadow:0 4px 12px rgba(15,23,42,.22); }
        .message-image-dot-btn:hover { background:rgba(15,23,42,.9); }
        .message-image-mini-menu { position:absolute; top:38px; right:7px; z-index:8; display:flex; flex-direction:column; min-width:110px; padding:5px; border:1px solid rgba(148,163,184,.28); border-radius:10px; background:#fff; box-shadow:0 10px 28px rgba(15,23,42,.18); }
        .message-image-mini-menu button { border:0; background:transparent; text-align:left; padding:8px 10px; border-radius:7px; font-size:12px; cursor:pointer; color:#111827; }
        .message-image-mini-menu button:hover { background:#f1f5f9; }

        /* Multiple images: always one image per row on every screen size. */
        .message-image-grid > .message-image-item {
          display:block !important;
          width:100% !important;
        }
        .message-image-grid > .message-image-item + .message-image-item {
          margin-top:0;
        }
        .message-image-dot-btn:focus-visible,
        .message-image-mini-menu button:focus-visible {
          outline:2px solid #2563eb;
          outline-offset:2px;
        }

        /* FINAL: independent, composable Bold + Underline + Color. */
        .typing-format-marker {
          display: inline !important;
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
        }
        .composer-input-row .text-input span[data-typing-marker][data-bold="1"] {
          font-weight: 900 !important;
        }
        .composer-input-row .text-input span[data-typing-marker][data-bold="0"] {
          font-weight: 400 !important;
        }
        .composer-input-row .text-input span[data-typing-marker][data-underline="1"] {
          text-decoration: underline !important;
          text-underline-offset: 3px !important;
        }
        .composer-input-row .text-input span[data-typing-marker][data-underline="0"] {
          text-decoration: none !important;
        }
        .composer-input-row .text-input span[data-typing-marker] {
          color: var(--typing-color, #111111) !important;
          -webkit-text-fill-color: var(--typing-color, #111111) !important;
        }
        .composer-input-row .text-input span[style*="color"]:not([data-typing-marker]) {
          -webkit-text-fill-color: currentColor !important;
        }
        .composer-input-row .text-input font[color] {
          -webkit-text-fill-color: currentColor !important;
        }
        .message-text span[style*="color"] {
          -webkit-text-fill-color: currentColor !important;
        }
        .message-text font[color] {
          -webkit-text-fill-color: currentColor !important;
        }
        .message-text span[style*="color"] *,
        .message-text font[color] * {
          color: inherit !important;
          -webkit-text-fill-color: currentColor !important;
        }
        /* FINAL: color stays active while Bold/Underline are toggled. */
        .composer-input-row .text-input {
          color: var(--composerColor, #111111) !important;
          -webkit-text-fill-color: var(--composerColor, #111111) !important;
        }
        .composer-input-row .text-input span[style*="color"],
        .composer-input-row .text-input font[color] {
          -webkit-text-fill-color: currentColor !important;
        }
        .composer-input-row .text-input strong,
        .composer-input-row .text-input b {
          font-weight: 900 !important;
        }
        .composer-input-row .text-input u {
          text-decoration: underline !important;
          text-decoration-thickness: 1.5px !important;
          text-underline-offset: 3px !important;
        }



        /* FINAL AUTHORITATIVE CHAT FORMAT FIX:
           child formatting must override the generic message font rule. */
        .message-bubble .message-text strong,
        .message-bubble .message-text b,
        .message-bubble .message-text span[style*="font-weight"],
        .message-bubble .image-description-text strong,
        .message-bubble .image-description-text b,
        .message-bubble .file-description-text strong,
        .message-bubble .file-description-text b {
          font-weight: 900 !important;
        }

        .message-bubble .message-text u,
        .message-bubble .message-text span[style*="text-decoration"],
        .message-bubble .image-description-text u,
        .message-bubble .file-description-text u {
          text-decoration-line: underline !important;
          text-decoration-style: solid !important;
          text-decoration-thickness: 1.5px !important;
          text-underline-offset: 3px !important;
        }

        .message-bubble .message-text span[style*="color"],
        .message-bubble .message-text font[color],
        .message-bubble .image-description-text span[style*="color"],
        .message-bubble .image-description-text font[color],
        .message-bubble .file-description-text span[style*="color"],
        .message-bubble .file-description-text font[color] {
          color: inherit;
          -webkit-text-fill-color: currentColor !important;
        }

        .message-bubble .message-text strong span[style*="color"],
        .message-bubble .message-text b span[style*="color"],
        .message-bubble .message-text strong[style*="color"],
        .message-bubble .message-text b[style*="color"] {
          font-weight: 900 !important;
          -webkit-text-fill-color: currentColor !important;
        }


        /* FINAL INDEPENDENT FORMAT CONTRACT: child HTML wins on chat. */
        .message-bubble .message-text strong,
        .message-bubble .message-text b,
        .message-bubble .message-text strong *,
        .message-bubble .message-text b * {
          font-weight: 900 !important;
        }
        .message-bubble .message-text u,
        .message-bubble .message-text u * {
          text-decoration-line: underline !important;
          text-decoration-style: solid !important;
        }
        .message-bubble .message-text strong u,
        .message-bubble .message-text b u,
        .message-bubble .message-text u strong,
        .message-bubble .message-text u b {
          font-weight: 900 !important;
          text-decoration-line: underline !important;
        }
        .message-bubble .message-text span[style*="font-weight: 400"],
        .message-bubble .message-text span[style*="font-weight:400"] {
          font-weight: 400 !important;
        }

        /* FINAL TITLE: only the first visual line is bold; all later lines normal. */
        .text-input.title-editor-mode,
        .text-input.title-editor-mode * {
          font-weight: 400 !important;
        }
        .text-input.title-editor-mode::first-line {
          font-weight: 900 !important;
        }
        .message-title-text,
        .message-title-text * {
          font-weight: 500 !important;
        }
        .message-title-text::first-line {
          font-weight: 900 !important;
        }
        .message-title-text .message-link {
          font-weight: inherit !important;
        }
        .message-link {
          display: inline !important;
          max-width: 100% !important;
          color: #2563eb !important;
          text-decoration: underline !important;
          text-underline-offset: 2px !important;
          cursor: pointer !important;
          user-select: text !important;
          -webkit-user-select: text !important;
          pointer-events: auto !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }
        /* FINAL FORMAT RENDER FIX: chat must preserve the exact inline formatting */
        .message-text strong,
        .message-text b,
        .message-text [style*="font-weight:bold"],
        .message-text [style*="font-weight: bold"],
        .message-text [style*="font-weight:700"],
        .message-text [style*="font-weight: 700"],
        .message-text [style*="font-weight:800"],
        .message-text [style*="font-weight: 800"],
        .message-text [style*="font-weight:900"],
        .message-text [style*="font-weight: 900"] {
          font-weight: 900 !important;
        }
        .message-text u,
        .message-text [style*="text-decoration:underline"],
        .message-text [style*="text-decoration: underline"],
        .message-text [style*="text-decoration-line:underline"],
        .message-text [style*="text-decoration-line: underline"] {
          text-decoration-line: underline !important;
          text-decoration-style: solid !important;
          text-decoration-thickness: 1.5px !important;
          text-underline-offset: 2px !important;
        }
        .message-text span[style*="color"],
        .message-text font[color] {
          -webkit-text-fill-color: currentColor !important;
        }
        .text-input strong,
        .text-input b,
        .text-input [style*="font-weight:bold"],
        .text-input [style*="font-weight: bold"],
        .text-input [style*="font-weight:700"],
        .text-input [style*="font-weight: 700"],
        .text-input [style*="font-weight:800"],
        .text-input [style*="font-weight: 800"],
        .text-input [style*="font-weight:900"],
        .text-input [style*="font-weight: 900"] {
          font-weight: 900 !important;
        }
        .text-input u,
        .text-input [style*="text-decoration:underline"],
        .text-input [style*="text-decoration: underline"],
        .text-input [style*="text-decoration-line:underline"],
        .text-input [style*="text-decoration-line: underline"] {
          text-decoration-line: underline !important;
          text-decoration-style: solid !important;
          text-decoration-thickness: 1.5px !important;
          text-underline-offset: 2px !important;
        }
        .text-input span[style*="color"],
        .text-input font[color] {
          -webkit-text-fill-color: currentColor !important;
        }
      `}

</style>
    </div>
  );
}
