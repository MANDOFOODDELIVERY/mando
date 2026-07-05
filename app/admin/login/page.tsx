import { PasswordIcon } from "@/components/svgs/DefaultIcons";
import { OnboardingIconFive } from "@/components/svgs/OnboardingIcons";
import { FaEye } from "react-icons/fa";

const AdminLogin = () => {
  return (
    <div className="flex justify-between items-center">
      <div className="w-[40%]">
        <img
          src="/admin-onboarding.png"
          alt="admin-onboarding"
          className="h-[90vh] w-full"
        />
      </div>
      <div className="w-[35%] flex flex-col mx-auto">
        <h2 className="text-[40px] font-semibold">Welcome back</h2>
        <p className="text-[#A4A4A4] text-[16px]">
          Sign in to manage operations, vendors, riders, finances, and marketing
          activities.
        </p>

        <div className="mt-10 flex flex-col space-y-6">
          <div className="flex flex-col space-y-3">
            <label htmlFor="email">Email Address</label>
            <input
              type="text"
              id="email"
              className="border border-[#ccc] rounded-md p-3 outline-none"
              placeholder="mandoadmin@gmail.com"
            />
          </div>

          <div className="flex flex-col space-y-3">
            <label htmlFor="email">Password</label>
            <div className="border border-[#ccc] rounded-md p-3 w-full flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <PasswordIcon />
                <input
                  type="password"
                  id="password"
                  className="border-none outline-none"
                  placeholder="********"
                />
              </div>

              <div className="">
                <FaEye color="#808080" size={16} />
              </div>
            </div>
          </div>

          <button className="w-full bg-[#DFB400] p-4 rounded-lg text-center text-white font-semibold mt-6 hover:bg-[#C9A300] transition disabled:opacity-50">
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
