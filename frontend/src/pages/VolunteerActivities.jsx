import { Component } from "react";
import EventList from "../components/EventList";

class VolunteerActivities extends Component {
  render() {
    return (
      <div>
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-10 mt-4">
          <h1 className="text-2xl md:text-4xl font-semibold text-[#DCBA58] mb-8 md:mb-14 text-center">
            Hoạt Động Tình Nguyện Của Bạn
          </h1>
          <div className="mt-6 md:mt-10">
            <EventList />
          </div>
        </div>
      </div>
    );
  }
}

export default VolunteerActivities;
